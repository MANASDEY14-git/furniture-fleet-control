-- Fix any remaining functions that reference sales_order_items without schema prefix
-- Check and fix the handle_sales_variant_stock_v2 function specifically for sales_order_items reference

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
    FROM public.sales_order_items soi
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