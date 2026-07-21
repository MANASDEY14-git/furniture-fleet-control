-- Fix function search path security warnings

-- Update the BOM material deduction function with proper search path
CREATE OR REPLACE FUNCTION public.deduct_bom_materials_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bom_record RECORD;
  component_record RECORD;
  customization_record RECORD;
  material_to_deduct_id uuid;
  qty_to_deduct numeric;
  material_name text;
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

  -- Loop through material components and deduct stock
  FOR component_record IN
    SELECT * FROM public.bom_components
    WHERE bom_id = bom_record.id AND component_type = 'material'
  LOOP
    -- Check if there's a customization for this component
    SELECT * INTO customization_record
    FROM public.sales_customizations 
    WHERE sale_id = NEW.order_id AND bom_component_id = component_record.id;
    
    IF customization_record.id IS NOT NULL THEN
      -- Use customized material
      material_to_deduct_id := customization_record.selected_material_id;
      qty_to_deduct := COALESCE(customization_record.quantity_used, 0) * COALESCE(NEW.quantity, 0);
    ELSE
      -- Use default material from BOM
      material_to_deduct_id := component_record.material_id;
      qty_to_deduct := COALESCE(component_record.quantity_required, 0) * COALESCE(NEW.quantity, 0);
    END IF;

    IF material_to_deduct_id IS NULL OR qty_to_deduct = 0 THEN
      CONTINUE;
    END IF;

    -- Get material name for logging
    SELECT name INTO material_name FROM public.materials WHERE id = material_to_deduct_id;

    -- Deduct material stock (allow negative quantities)
    UPDATE public.materials
    SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
        updated_at = now()
    WHERE id = material_to_deduct_id;

    -- Log the material stock movement
    INSERT INTO public.material_stock_movements (
      material_id,
      movement_type,
      quantity_change,
      reference_type,
      reference_id,
      notes
    ) VALUES (
      material_to_deduct_id,
      'sale',
      -qty_to_deduct,
      'sales_order_item',
      NEW.id,
      CASE 
        WHEN customization_record.id IS NOT NULL THEN
          'Customized material used for BOM item: ' || COALESCE(NEW.item_name, 'Unknown item') || ' (Component: ' || COALESCE(component_record.component_name, 'Unknown component') || ', Custom option: ' || COALESCE(customization_record.selected_option_name, material_name) || ')'
        ELSE
          'Default material used for BOM item: ' || COALESCE(NEW.item_name, 'Unknown item') || ' (Component: ' || COALESCE(component_record.component_name, 'Unknown component') || ')'
      END
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Update material purchase trigger with proper search path
CREATE OR REPLACE FUNCTION public.update_material_stock_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update material stock (allow negative starting values)
  UPDATE materials 
  SET quantity_available = COALESCE(quantity_available, 0) + NEW.quantity,
      cost_price = NEW.unit_cost,
      updated_at = now()
  WHERE id = NEW.material_id;
  
  -- Log stock movement with detailed information
  INSERT INTO material_stock_movements (
    material_id, 
    movement_type, 
    quantity_change, 
    reference_type, 
    reference_id, 
    notes
  ) VALUES (
    NEW.material_id, 
    'purchase', 
    NEW.quantity, 
    'material_purchase', 
    NEW.id, 
    'Material purchased - Invoice: ' || COALESCE(NEW.invoice_number, 'N/A') || ', Unit Cost: ₹' || NEW.unit_cost
  );
  
  RETURN NEW;
END;
$function$;