-- Phase 1: Fix Database Foundation for Item Variants

-- First, ensure we have proper triggers for variant stock management
-- Drop existing triggers that might conflict
DROP TRIGGER IF EXISTS handle_sales_variant_stock_trigger ON sales_order_items;
DROP TRIGGER IF EXISTS deduct_variant_stock_trigger ON sales_order_items;
DROP TRIGGER IF EXISTS update_parent_item_quantity_trigger ON item_variants;

-- Create improved function to handle variant stock deduction on sales
CREATE OR REPLACE FUNCTION public.handle_sales_variant_stock_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If a variant_id is present, deduct from item_variants
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
    -- If no variant, deduct from the base item
    UPDATE items
    SET quantity_available = quantity_available - NEW.quantity,
        updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create improved function to update parent item quantity when variant changes
CREATE OR REPLACE FUNCTION public.update_parent_item_quantity_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT
  IF (TG_OP = 'INSERT' AND NEW.item_id IS NOT NULL) THEN
    UPDATE items
    SET quantity_available = (
      SELECT COALESCE(SUM(quantity_available), 0)
      FROM item_variants
      WHERE item_id = NEW.item_id
    ),
    updated_at = now()
    WHERE id = NEW.item_id;
    RETURN NEW;
  END IF;
  
  -- Handle UPDATE
  IF (TG_OP = 'UPDATE' AND NEW.item_id IS NOT NULL) THEN
    UPDATE items
    SET quantity_available = (
      SELECT COALESCE(SUM(quantity_available), 0)
      FROM item_variants
      WHERE item_id = NEW.item_id
    ),
    updated_at = now()
    WHERE id = NEW.item_id;
    
    -- If item_id was changed, also update the old parent
    IF (OLD.item_id IS NOT NULL AND OLD.item_id <> NEW.item_id) THEN
      UPDATE items
      SET quantity_available = (
        SELECT COALESCE(SUM(quantity_available), 0)
        FROM item_variants
        WHERE item_id = OLD.item_id
      ),
      updated_at = now()
      WHERE id = OLD.item_id;
    END IF;
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF (TG_OP = 'DELETE' AND OLD.item_id IS NOT NULL) THEN
    UPDATE items
    SET quantity_available = (
      SELECT COALESCE(SUM(quantity_available), 0)
      FROM item_variants
      WHERE item_id = OLD.item_id
    ),
    updated_at = now()
    WHERE id = OLD.item_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create function to handle variant stock updates on purchases
CREATE OR REPLACE FUNCTION public.update_variant_stock_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
  variant_id_val uuid;
  item_id_val uuid;
  unit_price_val numeric;
  quantity_val numeric;
BEGIN
  -- Loop through each item in the purchase JSON
  FOR item IN
    SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    variant_id_val := (item->>'variant_id')::uuid;
    item_id_val := (item->>'item_id')::uuid;
    unit_price_val := (item->>'unit_price')::numeric;
    quantity_val := (item->>'quantity')::numeric;
    
    -- Update variant stock if variant_id exists
    IF variant_id_val IS NOT NULL THEN
      UPDATE item_variants
      SET quantity_available = quantity_available + quantity_val,
          cost_price = unit_price_val,
          updated_at = now()
      WHERE id = variant_id_val;
    ELSE
      -- Update main item stock if no variant
      UPDATE items
      SET quantity_available = quantity_available + quantity_val,
          cost_price = unit_price_val,
          updated_at = now()
      WHERE id = item_id_val;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the triggers
CREATE TRIGGER handle_sales_variant_stock_trigger_v2
  AFTER INSERT ON sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_variant_stock_v2();

CREATE TRIGGER update_parent_item_quantity_trigger_v2
  AFTER INSERT OR UPDATE OR DELETE ON item_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_parent_item_quantity_v2();

CREATE TRIGGER update_variant_stock_on_purchase_trigger
  AFTER INSERT ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_variant_stock_on_purchase();

-- Add constraints to ensure data integrity
ALTER TABLE item_variants 
ADD CONSTRAINT check_positive_quantity 
CHECK (quantity_available >= 0);

ALTER TABLE sales_order_items
ADD CONSTRAINT check_variant_or_item_required
CHECK (variant_id IS NOT NULL OR item_id IS NOT NULL);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_item_variants_item_id ON item_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_variant_id ON sales_order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_item_variant_attributes_variant_id ON item_variant_attributes(variant_id);

-- Create a view for easy variant display with attributes
CREATE OR REPLACE VIEW variant_details AS
SELECT 
  iv.*,
  i.name as item_name,
  i.category_id,
  STRING_AGG(av.value, ' / ' ORDER BY a.name) as variant_display_name
FROM item_variants iv
JOIN items i ON iv.item_id = i.id
LEFT JOIN item_variant_attributes iva ON iv.id = iva.variant_id
LEFT JOIN attribute_values av ON iva.attribute_value_id = av.id
LEFT JOIN attributes a ON av.attribute_id = a.id
GROUP BY iv.id, i.name, i.category_id;