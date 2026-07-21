-- Update the sales variant stock function to allow negative stock
CREATE OR REPLACE FUNCTION public.handle_sales_variant_stock_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If a variant_id is present, deduct from item_variants (allow negative stock)
  IF NEW.variant_id IS NOT NULL THEN
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
    -- If no variant, deduct from the base item (allow negative stock)
    UPDATE items
    SET quantity_available = quantity_available - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$;