-- Fix the purchase stock update function to properly handle negative stock
CREATE OR REPLACE FUNCTION public.update_item_stock_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  -- Only update stock if this is a direct purchase with item_id (not JSON-based)
  IF NEW.item_id IS NOT NULL THEN
    UPDATE public.items
    SET quantity_available = quantity_available + NEW.quantity,
        cost_price = CASE 
          WHEN NEW.quantity > 0 THEN NEW.total_cost / NEW.quantity
          ELSE cost_price 
        END,
        last_restocked_date = NEW.date,
        updated_at = now()
    WHERE id = NEW.item_id;
    
    RAISE NOTICE 'Updated stock for item %: added % quantity, new total: %', 
      NEW.item_id, NEW.quantity, 
      (SELECT quantity_available FROM items WHERE id = NEW.item_id);
      
  ELSIF NEW.items IS NOT NULL THEN
    -- Handle legacy JSON-based purchases (keep existing logic)
    DECLARE
      item jsonb;
      item_id_val uuid;
      unit_price_val numeric;
      quantity_val numeric;
      current_qty integer;
    BEGIN
      FOR item IN
        SELECT * FROM jsonb_array_elements(NEW.items)
      LOOP
        item_id_val := (item->>'item_id')::uuid;
        unit_price_val := (item->>'unit_price')::numeric;
        quantity_val := (item->>'quantity')::numeric;
        
        -- Get current quantity for logging
        SELECT quantity_available INTO current_qty FROM items WHERE id = item_id_val;
        
        UPDATE public.items
        SET quantity_available = quantity_available + quantity_val,
            cost_price = unit_price_val,
            last_restocked_date = NEW.date,
            updated_at = now()
        WHERE id = item_id_val;
        
        RAISE NOTICE 'Updated stock for item %: was %, added %, now %', 
          item_id_val, current_qty, quantity_val, current_qty + quantity_val;
      END LOOP;
    END;
  END IF;

  RETURN NEW;
END;
$function$;