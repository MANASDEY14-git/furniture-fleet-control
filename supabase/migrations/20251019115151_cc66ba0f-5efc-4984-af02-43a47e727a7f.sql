-- Fix BOM material deduction to prevent double-deduction when customization exists
-- Only deduct customized material OR default material, never both

DROP FUNCTION IF EXISTS public.deduct_bom_materials_for_order_item() CASCADE;

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
  has_customization boolean;
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

  -- Loop through material components
  FOR component_record IN
    SELECT * FROM public.bom_components
    WHERE bom_id = bom_record.id AND component_type = 'material'
  LOOP
    -- CRITICAL FIX: Check for customization FIRST
    SELECT * INTO customization_record
    FROM public.sales_customizations 
    WHERE sale_id = NEW.order_id AND bom_component_id = component_record.id;
    
    has_customization := (customization_record.id IS NOT NULL);
    
    -- Decision logic: Use customized material OR default material, NEVER both
    IF has_customization THEN
      -- Use ONLY customized material
      material_to_deduct_id := customization_record.selected_material_id;
      qty_to_deduct := COALESCE(customization_record.quantity_used, 0) * COALESCE(NEW.quantity, 0);
      
      -- Get material name for logging
      SELECT name INTO material_name FROM public.materials WHERE id = material_to_deduct_id;
      
      -- Deduct customized material stock
      UPDATE public.materials
      SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
          updated_at = now()
      WHERE id = material_to_deduct_id;

      -- Log customized material movement
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
        '✓ CUSTOMIZED material: ' || COALESCE(material_name, 'Unknown') || 
        ' | Item: ' || COALESCE(NEW.item_name, 'Unknown') || 
        ' | Component: ' || COALESCE(component_record.component_name, 'Unknown') || 
        ' | Option: ' || COALESCE(customization_record.selected_option_name, 'Custom choice')
      );
      
    ELSE
      -- Use ONLY default material from BOM
      material_to_deduct_id := component_record.material_id;
      qty_to_deduct := COALESCE(component_record.quantity_required, 0) * COALESCE(NEW.quantity, 0);
      
      IF material_to_deduct_id IS NULL OR qty_to_deduct = 0 THEN
        CONTINUE; -- Skip if no material or zero quantity
      END IF;

      -- Get material name for logging
      SELECT name INTO material_name FROM public.materials WHERE id = material_to_deduct_id;

      -- Deduct default material stock
      UPDATE public.materials
      SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
          updated_at = now()
      WHERE id = material_to_deduct_id;

      -- Log default material movement
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
        'DEFAULT material: ' || COALESCE(material_name, 'Unknown') || 
        ' | Item: ' || COALESCE(NEW.item_name, 'Unknown') || 
        ' | Component: ' || COALESCE(component_record.component_name, 'Unknown')
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_deduct_bom_materials_for_order_item ON public.sales_order_items;
CREATE TRIGGER trigger_deduct_bom_materials_for_order_item
  AFTER INSERT ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_bom_materials_for_order_item();

GRANT EXECUTE ON FUNCTION public.deduct_bom_materials_for_order_item() TO authenticated;