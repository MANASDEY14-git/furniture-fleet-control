
-- =============================================
-- 1. CREATE sales_order_bom_snapshot TABLE
-- =============================================
CREATE TABLE public.sales_order_bom_snapshot (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_item_id uuid NOT NULL REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
  bom_id uuid,
  bom_version integer,
  bom_name text,
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_bom_snapshot_order_item ON public.sales_order_bom_snapshot(sales_order_item_id);

ALTER TABLE public.sales_order_bom_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view BOM snapshots for their store orders"
  ON public.sales_order_bom_snapshot FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    WHERE soi.id = sales_order_bom_snapshot.sales_order_item_id
    AND user_has_store_access(so.store_id)
  ));

CREATE POLICY "System can insert BOM snapshots"
  ON public.sales_order_bom_snapshot FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 2. CREATE sales_order_material_usage TABLE
-- =============================================
CREATE TABLE public.sales_order_material_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_item_id uuid NOT NULL REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id),
  material_name text,
  quantity_used numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'fixed' CHECK (source IN ('fixed', 'customized', 'default_option')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_material_usage_order_item ON public.sales_order_material_usage(sales_order_item_id);
CREATE INDEX idx_material_usage_material ON public.sales_order_material_usage(material_id);

ALTER TABLE public.sales_order_material_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view material usage for their store orders"
  ON public.sales_order_material_usage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    WHERE soi.id = sales_order_material_usage.sales_order_item_id
    AND user_has_store_access(so.store_id)
  ));

CREATE POLICY "System can insert material usage"
  ON public.sales_order_material_usage FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 3. CREATE sales_order_material_cost VIEW
-- =============================================
CREATE OR REPLACE VIEW public.sales_order_material_cost AS
SELECT 
  so.id AS sales_order_id,
  so.order_number,
  so.total_amount AS order_total,
  COALESCE(SUM(mu.total_cost), 0) AS total_material_cost,
  so.total_amount - COALESCE(SUM(mu.total_cost), 0) AS margin
FROM public.sales_orders so
LEFT JOIN public.sales_order_items soi ON soi.order_id = so.id
LEFT JOIN public.sales_order_material_usage mu ON mu.sales_order_item_id = soi.id
GROUP BY so.id, so.order_number, so.total_amount;

-- =============================================
-- 4. REPLACE TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.deduct_bom_materials_for_order_item()
RETURNS TRIGGER AS $$
DECLARE
  bom_record RECORD;
  component_record RECORD;
  customization_record RECORD;
  option_record RECORD;
  material_to_deduct_id uuid;
  qty_to_deduct numeric;
  material_name text;
  material_avg_cost numeric;
  has_customization boolean;
  deduction_source text;
  bom_snapshot jsonb;
BEGIN
  -- Find the active BOM for the item
  SELECT * INTO bom_record
  FROM public.bom
  WHERE item_id = NEW.item_id AND is_active = true
  ORDER BY version DESC
  LIMIT 1;

  IF bom_record.id IS NULL THEN
    RETURN NEW; -- No BOM, nothing to deduct
  END IF;

  -- =============================================
  -- BUILD & STORE BOM SNAPSHOT
  -- =============================================
  SELECT jsonb_build_object(
    'bom_id', bom_record.id,
    'bom_name', bom_record.name,
    'bom_version', bom_record.version,
    'item_id', bom_record.item_id,
    'estimated_cost', bom_record.estimated_cost,
    'components', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', bc.id,
        'component_name', bc.component_name,
        'component_type', bc.component_type,
        'material_id', bc.material_id,
        'quantity_required', bc.quantity_required,
        'is_customizable', bc.is_customizable,
        'hourly_rate', bc.hourly_rate,
        'time_hours', bc.time_hours,
        'time_minutes', bc.time_minutes,
        'service_cost', bc.service_cost,
        'notes', bc.notes,
        'material', (SELECT jsonb_build_object('id', m.id, 'name', m.name, 'unit', m.unit, 'avg_cost', m.avg_cost) FROM public.materials m WHERE m.id = bc.material_id),
        'options', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', bco.id,
            'option_name', bco.option_name,
            'material_id', bco.material_id,
            'quantity_required', bco.quantity_required,
            'price_adjustment', bco.price_adjustment,
            'is_default', bco.is_default,
            'material', (SELECT jsonb_build_object('id', m2.id, 'name', m2.name, 'unit', m2.unit, 'avg_cost', m2.avg_cost) FROM public.materials m2 WHERE m2.id = bco.material_id)
          ))
          FROM public.bom_component_options bco WHERE bco.bom_component_id = bc.id
        ), '[]'::jsonb)
      ))
      FROM public.bom_components bc WHERE bc.bom_id = bom_record.id
    ), '[]'::jsonb)
  ) INTO bom_snapshot;

  INSERT INTO public.sales_order_bom_snapshot (
    sales_order_item_id, bom_id, bom_version, bom_name, snapshot_json
  ) VALUES (
    NEW.id, bom_record.id, bom_record.version, bom_record.name, bom_snapshot
  );

  -- =============================================
  -- DEDUCT MATERIALS + RECORD USAGE
  -- =============================================
  FOR component_record IN
    SELECT * FROM public.bom_components
    WHERE bom_id = bom_record.id AND component_type = 'material'
  LOOP
    SELECT * INTO customization_record
    FROM public.sales_customizations 
    WHERE sale_id = NEW.order_id AND bom_component_id = component_record.id;
    
    has_customization := (customization_record.id IS NOT NULL);
    
    IF has_customization THEN
      material_to_deduct_id := customization_record.selected_material_id;
      qty_to_deduct := COALESCE(customization_record.quantity_used, 0) * COALESCE(NEW.quantity, 0);
      deduction_source := 'customized';
      
      SELECT name, COALESCE(avg_cost, 0) INTO material_name, material_avg_cost
      FROM public.materials WHERE id = material_to_deduct_id;
      
      UPDATE public.materials
      SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
          updated_at = now()
      WHERE id = material_to_deduct_id;

      INSERT INTO public.material_stock_movements (
        material_id, movement_type, quantity_change, reference_type, reference_id, notes
      ) VALUES (
        material_to_deduct_id, 'sale', -qty_to_deduct, 'sales_order_item', NEW.id,
        '✓ CUSTOMIZED material: ' || COALESCE(material_name, 'Unknown') || 
        ' | Item: ' || COALESCE(NEW.item_name, 'Unknown') || 
        ' | Component: ' || COALESCE(component_record.component_name, 'Unknown') || 
        ' | Option: ' || COALESCE(customization_record.selected_option_name, 'Custom choice')
      );

      -- Record material usage
      INSERT INTO public.sales_order_material_usage (
        sales_order_item_id, material_id, material_name, quantity_used, unit_cost, total_cost, source
      ) VALUES (
        NEW.id, material_to_deduct_id, material_name, qty_to_deduct,
        material_avg_cost, qty_to_deduct * material_avg_cost, 'customized'
      );
      
    ELSE
      IF component_record.is_customizable THEN
        SELECT * INTO option_record
        FROM public.bom_component_options
        WHERE bom_component_id = component_record.id AND is_default = true
        LIMIT 1;
        
        IF option_record.id IS NULL THEN
          SELECT * INTO option_record
          FROM public.bom_component_options
          WHERE bom_component_id = component_record.id
          ORDER BY created_at
          LIMIT 1;
        END IF;
        
        IF option_record.id IS NULL THEN
          CONTINUE;
        END IF;
        
        material_to_deduct_id := option_record.material_id;
        qty_to_deduct := COALESCE(option_record.quantity_required, component_record.quantity_required, 0) * COALESCE(NEW.quantity, 0);
        deduction_source := 'default_option';
      ELSE
        material_to_deduct_id := component_record.material_id;
        qty_to_deduct := COALESCE(component_record.quantity_required, 0) * COALESCE(NEW.quantity, 0);
        deduction_source := 'fixed';
      END IF;
      
      IF material_to_deduct_id IS NULL OR qty_to_deduct = 0 THEN
        CONTINUE;
      END IF;

      SELECT name, COALESCE(avg_cost, 0) INTO material_name, material_avg_cost
      FROM public.materials WHERE id = material_to_deduct_id;

      UPDATE public.materials
      SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
          updated_at = now()
      WHERE id = material_to_deduct_id;

      INSERT INTO public.material_stock_movements (
        material_id, movement_type, quantity_change, reference_type, reference_id, notes
      ) VALUES (
        material_to_deduct_id, 'sale', -qty_to_deduct, 'sales_order_item', NEW.id,
        'DEFAULT material: ' || COALESCE(material_name, 'Unknown') || 
        ' | Item: ' || COALESCE(NEW.item_name, 'Unknown') || 
        ' | Component: ' || COALESCE(component_record.component_name, 'Unknown')
      );

      -- Record material usage
      INSERT INTO public.sales_order_material_usage (
        sales_order_item_id, material_id, material_name, quantity_used, unit_cost, total_cost, source
      ) VALUES (
        NEW.id, material_to_deduct_id, material_name, qty_to_deduct,
        material_avg_cost, qty_to_deduct * material_avg_cost, deduction_source
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
