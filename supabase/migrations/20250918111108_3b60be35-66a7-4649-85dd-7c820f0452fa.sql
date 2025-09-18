-- Fix purchase stock update: fully qualify references and rebuild dependency chain

-- Drop function with cascade to remove any dependent triggers that reference it
DROP FUNCTION IF EXISTS public.update_item_stock_on_purchase() CASCADE;

-- Recreate the corrected function
CREATE OR REPLACE FUNCTION public.update_item_stock_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Legacy JSON branch variables
  item jsonb;
  item_id_val uuid;
  unit_price_val numeric;
  quantity_val numeric;
  current_qty integer;
BEGIN
  -- Direct item purchase path
  IF NEW.item_id IS NOT NULL THEN
    UPDATE public.items
    SET quantity_available = COALESCE(quantity_available, 0) + NEW.quantity,
        cost_price = CASE WHEN NEW.quantity > 0 THEN NEW.total_cost / NEW.quantity ELSE cost_price END,
        last_restocked_date = NEW.date,
        updated_at = now()
    WHERE id = NEW.item_id;

  -- Legacy JSON array path (backward compatibility)
  ELSIF NEW.items IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_id_val := (item->>'item_id')::uuid;
      unit_price_val := (item->>'unit_price')::numeric;
      quantity_val := (item->>'quantity')::numeric;

      SELECT quantity_available INTO current_qty FROM public.items WHERE id = item_id_val;

      UPDATE public.items
      SET quantity_available = COALESCE(quantity_available, 0) + quantity_val,
          cost_price = unit_price_val,
          last_restocked_date = NEW.date,
          updated_at = now()
      WHERE id = item_id_val;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure a single clean trigger exists on purchases table
DROP TRIGGER IF EXISTS update_item_stock_on_purchase_trigger ON public.purchases;
DROP TRIGGER IF EXISTS trigger_update_item_stock_on_purchase ON public.purchases;
CREATE TRIGGER update_item_stock_on_purchase_trigger
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_stock_on_purchase();

GRANT EXECUTE ON FUNCTION public.update_item_stock_on_purchase() TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Show resulting trigger
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'purchases' AND trigger_schema = 'public';