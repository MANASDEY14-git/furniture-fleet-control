-- Check and fix the stock deduction trigger timing
-- The issue might be that the trigger on sales_order_items fires too early
-- Let's change it to fire AFTER the sales_order_items are inserted, not when sales_orders are created

-- First, let's drop the existing trigger on sales_order_items
DROP TRIGGER IF EXISTS handle_sales_stock_deduction_trigger ON public.sales_order_items;

-- Create a new trigger on sales_order_items that fires AFTER INSERT
CREATE TRIGGER handle_sales_stock_deduction_trigger
    AFTER INSERT ON public.sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.deduct_variant_stock_on_sale();

-- Also update the deduct_variant_stock_on_sale function to work with sales_order_items
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