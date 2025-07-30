-- Remove the strict positive quantity constraint that's causing issues
ALTER TABLE item_variants DROP CONSTRAINT IF EXISTS check_positive_quantity;

-- Update the sales variant stock function to prevent negative quantities
CREATE OR REPLACE FUNCTION public.handle_sales_variant_stock_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If a variant_id is present, deduct from item_variants
  IF NEW.variant_id IS NOT NULL THEN
    -- Check if sufficient stock is available
    IF (SELECT quantity_available FROM item_variants WHERE id = NEW.variant_id) < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for variant. Available: %, Requested: %', 
        (SELECT quantity_available FROM item_variants WHERE id = NEW.variant_id), NEW.quantity;
    END IF;
    
    UPDATE item_variants
    SET quantity_available = quantity_available - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.variant_id;
    
    -- Also update the parent item quantity (sum of all variants)
    UPDATE items
    SET quantity_available = (
      SELECT COALESCE(SUM(quantity_available), 0)
      FROM item_variants
      WHERE item_id = (SELECT item_id FROM item_variants WHERE id = NEW.variant_id)
    ),
    updated_at = now()
    WHERE id = (SELECT item_id FROM item_variants WHERE id = NEW.variant_id);
  ELSE
    -- If no variant, check and deduct from the base item
    IF (SELECT quantity_available FROM items WHERE id = NEW.item_id) < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for item. Available: %, Requested: %', 
        (SELECT quantity_available FROM items WHERE id = NEW.item_id), NEW.quantity;
    END IF;
    
    UPDATE items
    SET quantity_available = quantity_available - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$;