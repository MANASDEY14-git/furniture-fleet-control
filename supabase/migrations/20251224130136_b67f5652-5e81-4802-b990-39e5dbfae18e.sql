-- Fix double material stock updates & duplicate ledger rows
-- Cause: two AFTER INSERT triggers on public.material_purchases calling update_material_stock_on_purchase()

BEGIN;

-- 1) Keep only one trigger (keep trigger_update_material_stock_on_purchase)
DROP TRIGGER IF EXISTS update_material_stock_on_purchase_trigger ON public.material_purchases;

-- 2) Revert the extra stock that was added due to the duplicate trigger
WITH duplicated_purchases AS (
  SELECT msm.reference_id::uuid AS purchase_id
  FROM public.material_stock_movements msm
  WHERE msm.reference_type = 'material_purchase'
    AND msm.movement_type = 'purchase'
  GROUP BY msm.reference_id
  HAVING COUNT(*) > 1
), stock_to_revert AS (
  SELECT mp.material_id,
         SUM(mp.quantity)::numeric AS qty_to_subtract
  FROM public.material_purchases mp
  JOIN duplicated_purchases dp ON dp.purchase_id = mp.id
  GROUP BY mp.material_id
)
UPDATE public.materials m
SET quantity_available = COALESCE(m.quantity_available, 0) - str.qty_to_subtract,
    updated_at = NOW()
FROM stock_to_revert str
WHERE m.id = str.material_id;

-- 3) Remove duplicate material stock movement rows (keep first row per purchase)
DELETE FROM public.material_stock_movements msm
WHERE msm.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY reference_type, reference_id, movement_type
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM public.material_stock_movements
    WHERE reference_type = 'material_purchase'
      AND movement_type = 'purchase'
  ) t
  WHERE t.rn > 1
);

COMMIT;