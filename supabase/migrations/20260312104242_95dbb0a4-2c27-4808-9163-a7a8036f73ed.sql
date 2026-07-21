
-- Add service_cost_type to bom_components
ALTER TABLE public.bom_components 
  ADD COLUMN IF NOT EXISTS service_cost_type text NOT NULL DEFAULT 'fixed';

-- Add costing_method to materials
ALTER TABLE public.materials 
  ADD COLUMN IF NOT EXISTS costing_method text NOT NULL DEFAULT 'average';

-- Update the BOM estimated cost trigger to handle percentage services and costing_method
CREATE OR REPLACE FUNCTION public.update_bom_estimated_cost()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  material_total numeric := 0;
  labor_total numeric := 0;
  fixed_service_total numeric := 0;
  percentage_service_total numeric := 0;
  subtotal numeric := 0;
  final_total numeric := 0;
  rec RECORD;
BEGIN
  -- Calculate material costs using costing_method
  SELECT COALESCE(SUM(
    bc.quantity_required * 
    CASE 
      WHEN COALESCE(m.costing_method, 'average') = 'exact' 
        THEN COALESCE(m.cost_price, m.avg_cost, 0)
      ELSE 
        COALESCE(m.avg_cost, m.cost_price, 0)
    END
  ), 0) INTO material_total
  FROM public.bom_components bc
  LEFT JOIN public.materials m ON m.id = bc.material_id
  WHERE bc.bom_id = COALESCE(NEW.bom_id, OLD.bom_id)
    AND bc.component_type = 'material';

  -- Calculate labor costs
  SELECT COALESCE(SUM(
    (COALESCE(bc.time_hours, 0) + (COALESCE(bc.time_minutes, 0)::numeric / 60)) 
    * COALESCE(bc.hourly_rate, lc.default_hourly_rate, 0)
  ), 0) INTO labor_total
  FROM public.bom_components bc
  LEFT JOIN public.labor_categories lc ON lc.id = bc.labor_category_id
  WHERE bc.bom_id = COALESCE(NEW.bom_id, OLD.bom_id)
    AND bc.component_type = 'labor';

  subtotal := material_total + labor_total;

  -- Calculate fixed service costs
  SELECT COALESCE(SUM(bc.service_cost), 0) INTO fixed_service_total
  FROM public.bom_components bc
  WHERE bc.bom_id = COALESCE(NEW.bom_id, OLD.bom_id)
    AND bc.component_type = 'service'
    AND COALESCE(bc.service_cost_type, 'fixed') = 'fixed';

  -- Calculate percentage service costs
  SELECT COALESCE(SUM(subtotal * bc.service_cost / 100), 0) INTO percentage_service_total
  FROM public.bom_components bc
  WHERE bc.bom_id = COALESCE(NEW.bom_id, OLD.bom_id)
    AND bc.component_type = 'service'
    AND bc.service_cost_type = 'percentage';

  final_total := subtotal + fixed_service_total + percentage_service_total;

  -- Update the BOM's estimated cost
  UPDATE public.bom 
  SET estimated_cost = final_total,
      last_cost_calculation = NOW()
  WHERE id = COALESCE(NEW.bom_id, OLD.bom_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;
