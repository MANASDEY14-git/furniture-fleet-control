-- Drop all triggers that depend on variant functions
DROP TRIGGER IF EXISTS update_variant_stock_on_purchase_trigger ON public.purchases;
DROP TRIGGER IF EXISTS handle_sales_variant_stock_trigger ON public.sales_orders;
DROP TRIGGER IF EXISTS deduct_variant_stock_on_sale_trigger ON public.sales;
DROP TRIGGER IF EXISTS handle_sales_stock_deduction_trigger ON public.sales_order_items;

-- Now drop the functions
DROP FUNCTION IF EXISTS public.handle_sales_variant_stock_v2() CASCADE;
DROP FUNCTION IF EXISTS public.handle_sales_variant_stock() CASCADE;
DROP FUNCTION IF EXISTS public.update_variant_stock_on_purchase() CASCADE;
DROP FUNCTION IF EXISTS public.update_parent_item_quantity_v2() CASCADE;
DROP FUNCTION IF EXISTS public.update_parent_item_quantity() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_variant_stock_on_sale() CASCADE;

-- Create updated function to handle sales stock deduction for items only
CREATE OR REPLACE FUNCTION public.handle_sales_stock_deduction()
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
    -- Update main item stock only (no variants)
    UPDATE public.items
    SET quantity_available = quantity_available - order_item.quantity,
        updated_at = now()
    WHERE id = order_item.item_id;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create updated function to handle purchase stock updates for items only
CREATE OR REPLACE FUNCTION public.update_item_stock_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  item jsonb;
  item_id_val uuid;
  unit_price_val numeric;
  quantity_val numeric;
BEGIN
  -- Loop through each item in the purchase JSON
  FOR item IN
    SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    item_id_val := (item->>'item_id')::uuid;
    unit_price_val := (item->>'unit_price')::numeric;
    quantity_val := (item->>'quantity')::numeric;
    
    -- Update main item stock only (no variants)
    UPDATE public.items
    SET quantity_available = quantity_available + quantity_val,
        cost_price = unit_price_val,
        updated_at = now()
    WHERE id = item_id_val;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create updated function for direct sales stock deduction (items only)
CREATE OR REPLACE FUNCTION public.deduct_item_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  -- Deduct stock from main item only (no variants)
  UPDATE public.items
  SET quantity_available = quantity_available - NEW.quantity,
      updated_at = now()
  WHERE id = NEW.item_id;

  RETURN NEW;
END;
$function$;

-- Create triggers for the new functions
CREATE TRIGGER trigger_handle_sales_stock_deduction
  AFTER INSERT ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_stock_deduction();

CREATE TRIGGER trigger_update_item_stock_on_purchase
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_stock_on_purchase();

CREATE TRIGGER trigger_deduct_item_stock_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_item_stock_on_sale();