-- Fix sales-related database functions to properly reference the public schema

-- Fix handle_sales_variant_stock_v2 function
CREATE OR REPLACE FUNCTION public.handle_sales_variant_stock_v2()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  order_item RECORD;
BEGIN
  -- Loop through all order items for this sales order
  FOR order_item IN 
    SELECT soi.*, i.name as item_name
    FROM sales_order_items soi
    LEFT JOIN public.items i ON i.id = soi.item_id
    WHERE soi.order_id = NEW.id
  LOOP
    -- Update stock based on whether it's a variant or main item
    IF order_item.variant_id IS NOT NULL THEN
      -- Update variant stock
      UPDATE public.item_variants
      SET quantity_available = quantity_available - order_item.quantity,
          updated_at = now()
      WHERE id = order_item.variant_id;
    ELSE
      -- Update main item stock
      UPDATE public.items
      SET quantity_available = quantity_available - order_item.quantity,
          updated_at = now()
      WHERE id = order_item.item_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Fix deduct_variant_stock_on_sale function
CREATE OR REPLACE FUNCTION public.deduct_variant_stock_on_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  -- Check if this is a variant sale or regular item sale
  IF NEW.variant_id IS NOT NULL THEN
    -- Deduct stock from variant
    UPDATE public.item_variants
    SET quantity_available = quantity_available - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.variant_id;
  ELSE
    -- Deduct stock from main item
    UPDATE public.items
    SET quantity_available = quantity_available - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix deduct_bom_materials_on_sale function
CREATE OR REPLACE FUNCTION public.deduct_bom_materials_on_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  bom_record RECORD;
  component_record RECORD;
  customization_record RECORD;
  material_to_deduct_id uuid;
  quantity_to_deduct numeric;
BEGIN
  -- Get the BOM for this item
  SELECT * INTO bom_record 
  FROM public.bom 
  WHERE item_id = NEW.item_id AND is_active = true;
  
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
        quantity_to_deduct := customization_record.quantity_used * NEW.quantity;
      ELSE
        -- Use default material from BOM
        material_to_deduct_id := component_record.material_id;
        quantity_to_deduct := component_record.quantity_required * NEW.quantity;
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
        'Material used in production for sale order'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;