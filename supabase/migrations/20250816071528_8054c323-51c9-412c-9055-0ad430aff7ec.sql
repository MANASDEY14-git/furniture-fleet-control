-- Fix stock duplication by updating the purchase stock trigger to handle direct purchase records

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
        cost_price = NEW.total_cost / NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  ELSIF NEW.items IS NOT NULL THEN
    -- Handle legacy JSON-based purchases (keep existing logic)
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
        SET quantity_available = quantity_available + quantity_val,
            cost_price = unit_price_val,
            updated_at = now()
        WHERE id = item_id_val;
      END LOOP;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Remove the duplicate trigger that's also updating stock
DROP TRIGGER IF EXISTS trg_update_item_cost_and_date ON purchases;