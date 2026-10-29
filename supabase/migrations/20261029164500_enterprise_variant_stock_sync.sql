-- Migration: Enterprise Item Variant Stock Single Source of Truth
-- 1. Activate all non-discontinued variants so they are visible and auditable
-- 2. Synchronize parent item stock to strictly match the sum of active variants
-- 3. Eliminate purchase double-addition bug while keeping existing deductions intact

-- Step 1: Ensure all active variants have is_active = true
UPDATE public.item_variants 
SET is_active = true 
WHERE is_discontinued = false AND (is_active IS NULL OR is_active = false);

-- Step 2: Ensure sync function handles NULLs and calculates exact active variant sum
CREATE OR REPLACE FUNCTION public.sync_item_qty_from_variants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
  v_total_qty INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_parent_id := OLD.parent_item_id;
  ELSE
    v_parent_id := NEW.parent_item_id;
  END IF;

  -- Only sync parent items that actually have variants
  IF NOT EXISTS (
    SELECT 1 FROM public.item_variants WHERE parent_item_id = v_parent_id AND is_discontinued = FALSE LIMIT 1
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(quantity_available), 0)
    INTO v_total_qty
    FROM public.item_variants
   WHERE parent_item_id = v_parent_id
     AND is_active = TRUE
     AND is_discontinued = FALSE;

  UPDATE public.items
     SET quantity_available = v_total_qty,
         updated_at = NOW()
   WHERE id = v_parent_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop and recreate trigger to ensure it listens to all relevant changes
DROP TRIGGER IF EXISTS trg_sync_item_qty_from_variants ON public.item_variants;

CREATE TRIGGER trg_sync_item_qty_from_variants
AFTER INSERT OR UPDATE OF quantity_available, is_active, is_discontinued, parent_item_id OR DELETE
ON public.item_variants
FOR EACH ROW
EXECUTE FUNCTION public.sync_item_qty_from_variants();

-- Step 3: Fix update_item_stock_on_purchase to prevent double addition when purchasing variants
CREATE OR REPLACE FUNCTION public.update_item_stock_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.variant_id IS NOT NULL THEN
    -- Update the variant's quantity and cost
    -- (The trg_sync_item_qty_from_variants trigger will automatically update parent quantity)
    UPDATE public.item_variants
    SET
      quantity_available = quantity_available + NEW.quantity,
      cost_price = CASE 
        WHEN quantity_available + NEW.quantity > 0 THEN
          ((quantity_available * cost_price) + NEW.total_cost) / (quantity_available + NEW.quantity)
        ELSE NEW.total_cost / NEW.quantity
      END,
      updated_at = now()
    WHERE id = NEW.variant_id;

    -- Update parent item's weighted cost and restock date without double-adding quantity
    UPDATE public.items
    SET 
      cost_price = CASE 
        WHEN quantity_available > 0 THEN
          ((quantity_available * cost_price) + NEW.total_cost) / (quantity_available + NEW.quantity)
        ELSE NEW.total_cost / NEW.quantity
      END,
      last_restocked_date = NEW.date,
      updated_at = now()
    WHERE id = NEW.item_id;
  ELSE
    -- Item without variant: update parent item directly
    UPDATE public.items
    SET 
      quantity_available = quantity_available + NEW.quantity,
      cost_price = CASE 
        WHEN quantity_available + NEW.quantity > 0 THEN
          ((quantity_available * cost_price) + NEW.total_cost) / (quantity_available + NEW.quantity)
        ELSE NEW.total_cost / NEW.quantity
      END,
      last_restocked_date = NEW.date,
      updated_at = now()
    WHERE id = NEW.item_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 4: Fix reverse_purchase_stock to keep variant/parent stock in sync
CREATE OR REPLACE FUNCTION public.reverse_purchase_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.variant_id IS NOT NULL THEN
    UPDATE public.item_variants
    SET
      quantity_available = GREATEST(0, quantity_available - OLD.quantity),
      updated_at = now()
    WHERE id = OLD.variant_id;
  ELSE
    UPDATE public.items
    SET 
      quantity_available = GREATEST(0, quantity_available - OLD.quantity),
      updated_at = now()
    WHERE id = OLD.item_id;
  END IF;

  RETURN OLD;
END;
$$;

-- Step 5: Initial sync of all parent items that have variants
UPDATE public.items i
SET quantity_available = sub.total_qty, updated_at = now()
FROM (
  SELECT parent_item_id, COALESCE(SUM(quantity_available), 0) as total_qty
  FROM public.item_variants
  WHERE is_active = true AND is_discontinued = false
  GROUP BY parent_item_id
) sub
WHERE i.id = sub.parent_item_id;
