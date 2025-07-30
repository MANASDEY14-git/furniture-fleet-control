-- Remove all triggers from item_variants table
-- This migration ensures all triggers are properly removed

-- Drop all known triggers that might exist on item_variants table
DROP TRIGGER IF EXISTS update_item_variants_updated_at ON public.item_variants;
DROP TRIGGER IF EXISTS update_parent_item_quantity_trigger ON public.item_variants;
DROP TRIGGER IF EXISTS update_parent_item_quantity_v2_trigger ON public.item_variants;
DROP TRIGGER IF EXISTS trigger_sync_parent_quantity ON public.item_variants;
DROP TRIGGER IF EXISTS sync_parent_item_quantity ON public.item_variants;
DROP TRIGGER IF EXISTS update_parent_item_quantity_on_variant_change ON public.item_variants;

-- Also drop any triggers that might reference item_variants from other tables
DROP TRIGGER IF EXISTS update_item_variants_from_items ON public.items;
DROP TRIGGER IF EXISTS sync_variant_quantities ON public.items;

-- Drop any functions that might be used by these triggers
DROP FUNCTION IF EXISTS public.update_item_variants_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.sync_parent_item_quantity() CASCADE;
DROP FUNCTION IF EXISTS public.update_parent_item_quantity() CASCADE;

-- Force schema reload to ensure all changes are applied
NOTIFY pgrst, 'reload schema';
