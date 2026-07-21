-- Fix the remaining two functions that need search path set

-- Fix ping function
CREATE OR REPLACE FUNCTION public.ping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  null;
end;
$function$;

-- Fix update_inventory_on_sale function
CREATE OR REPLACE FUNCTION public.update_inventory_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Check if this is a new sale order item
    IF TG_OP = 'INSERT' THEN
        -- Reduce the available quantity in the items table (allow negative)
        UPDATE items
        SET quantity_available = COALESCE(quantity_available, 0) - NEW.quantity
        WHERE id = NEW.item_id;
    END IF;
    
    -- For updates (if you need to handle quantity changes)
    IF TG_OP = 'UPDATE' THEN
        -- First, add back the old quantity
        UPDATE items
        SET quantity_available = COALESCE(quantity_available, 0) + OLD.quantity
        WHERE id = OLD.item_id;
        
        -- Then subtract the new quantity (allow negative)
        UPDATE items
        SET quantity_available = COALESCE(quantity_available, 0) - NEW.quantity
        WHERE id = NEW.item_id;
    END IF;
    
    -- For deletes (if you need to handle order cancellations)
    IF TG_OP = 'DELETE' THEN
        -- Add back the quantity to inventory
        UPDATE items
        SET quantity_available = COALESCE(quantity_available, 0) + OLD.quantity
        WHERE id = OLD.item_id;
    END IF;
    
    RETURN NULL;
END;
$function$;