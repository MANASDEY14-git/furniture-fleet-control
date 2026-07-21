-- Drop the old/duplicate triggers that are causing the issue
DROP TRIGGER IF EXISTS trigger_sync_parent_quantity ON public.item_variants;
DROP TRIGGER IF EXISTS update_parent_item_quantity_trigger ON public.item_variants;

-- Keep only the working v2 trigger
-- (update_parent_item_quantity_trigger_v2 should remain)