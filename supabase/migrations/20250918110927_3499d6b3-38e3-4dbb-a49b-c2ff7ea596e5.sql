-- Fix the purchase trigger causing "relation 'items' does not exist" error
-- This happens because search_path is empty in the function

-- First, let's check current triggers
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'purchases' 
  AND trigger_schema = 'public';

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS update_item_stock_on_purchase_trigger ON public.purchases;
DROP FUNCTION IF EXISTS public.update_item_stock_on_purchase();

-- Create the corrected function with proper schema qualification
CREATE OR REPLACE FUNCTION public.update_item_stock_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only update stock if this is a direct purchase with item_id (not JSON-based)
  IF NEW.item_id IS NOT NULL THEN
    UPDATE public.items
    SET quantity_available = COALESCE(quantity_available, 0) + NEW.quantity,
        cost_price = CASE 
          WHEN NEW.quantity > 0 THEN NEW.total_cost / NEW.quantity
          ELSE cost_price 
        END,
        last_restocked_date = NEW.date,
        updated_at = now()
    WHERE id = NEW.item_id;
    
    RAISE NOTICE 'Updated stock for item %: added % quantity', NEW.item_id, NEW.quantity;
      
  ELSIF NEW.items IS NOT NULL THEN
    -- Handle legacy JSON-based purchases (keep for backward compatibility)
    DECLARE
      item jsonb;
      item_id_val uuid;
      unit_price_val numeric;
      quantity_val numeric;
    BEGIN
      FOR item IN
        SELECT * FROM jsonb_array_elements(NEW.items)
      LOOP
        item_id_val := (item->>'item_id')::uuid;
        unit_price_val := (item->>'unit_price')::numeric;
        quantity_val := (item->>'quantity')::numeric;
        
        UPDATE public.items
        SET quantity_available = COALESCE(quantity_available, 0) + quantity_val,
            cost_price = unit_price_val,
            last_restocked_date = NEW.date,
            updated_at = now()
        WHERE id = item_id_val;
        
        RAISE NOTICE 'Updated stock for item %: added % quantity', item_id_val, quantity_val;
      END LOOP;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER update_item_stock_on_purchase_trigger
    AFTER INSERT ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_item_stock_on_purchase();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_item_stock_on_purchase() TO authenticated;

-- Check final trigger status
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'purchases' 
  AND trigger_schema = 'public';