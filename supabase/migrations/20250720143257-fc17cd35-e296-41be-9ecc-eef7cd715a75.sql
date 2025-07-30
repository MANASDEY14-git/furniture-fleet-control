-- Sync all parent item quantities with their variant totals
UPDATE items
SET quantity_available = (
  SELECT COALESCE(SUM(iv.quantity_available), 0)
  FROM item_variants iv
  WHERE iv.item_id = items.id
),
updated_at = now()
WHERE id IN (
  SELECT DISTINCT item_id 
  FROM item_variants 
  WHERE item_id IS NOT NULL
);

-- Also ensure any items without variants maintain their current stock
-- (This query won't change items that don't have variants)