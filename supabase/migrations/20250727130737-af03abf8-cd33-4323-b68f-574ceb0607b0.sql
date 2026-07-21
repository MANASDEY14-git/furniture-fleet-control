-- Fix the BOM material deduction function to work with sales_orders
-- Create a new function specifically for sales orders that processes all order items

CREATE OR REPLACE FUNCTION public.deduct_bom_materials_on_sales_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  order_item_record RECORD;
  bom_record RECORD;
  component_record RECORD;
  customization_record RECORD;
  material_to_deduct_id uuid;
  quantity_to_deduct numeric;
BEGIN
  -- Loop through all items in this sales order
  FOR order_item_record IN 
    SELECT * FROM public.sales_order_items WHERE order_id = NEW.id
  LOOP
    -- Get the BOM for this item
    SELECT * INTO bom_record 
    FROM public.bom 
    WHERE item_id = order_item_record.item_id AND is_active = true;
    
    IF bom_record.id IS NOT NULL THEN
      -- Loop through BOM components
      FOR component_record IN 
        SELECT * FROM public.bom_components WHERE bom_id = bom_record.id
      LOOP
        -- Check if there's a customization for this component
        SELECT * INTO customization_record
        FROM public.sales_customizations 
        WHERE sale_id = NEW.id AND bom_component_id = component_record.id;
        
        IF customization_record.id IS NOT NULL THEN
          -- Use customized material
          material_to_deduct_id := customization_record.selected_material_id;
          quantity_to_deduct := customization_record.quantity_used * order_item_record.quantity;
        ELSE
          -- Use default material from BOM
          material_to_deduct_id := component_record.material_id;
          quantity_to_deduct := component_record.quantity_required * order_item_record.quantity;
        END IF;
        
        -- Deduct material stock
        UPDATE public.materials
        SET quantity_available = quantity_available - quantity_to_deduct,
            updated_at = now()
        WHERE id = material_to_deduct_id;
        
        -- Log the material movement
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
          -quantity_to_deduct,
          'sales_order',
          NEW.id,
          'Material used in production for sales order item: ' || order_item_record.item_name
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Drop the old trigger and create a new one with the correct function
DROP TRIGGER IF EXISTS trigger_deduct_bom_materials_on_sales_order ON public.sales_orders;

CREATE TRIGGER trigger_deduct_bom_materials_on_sales_order
    AFTER INSERT ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.deduct_bom_materials_on_sales_order();