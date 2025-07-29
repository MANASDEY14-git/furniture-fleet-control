-- Remove item variants system completely with CASCADE

-- Drop all variant-related functions first
DROP FUNCTION IF EXISTS public.create_item_variant_direct(uuid, text, integer, numeric, numeric, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.update_item_variant_direct(uuid, text, integer, numeric, numeric, uuid[]) CASCADE;
DROP FUNCTION IF EXISTS public.delete_item_variant_direct(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_item_variants_with_attributes(uuid) CASCADE;

-- Drop the variant_details view first
DROP VIEW IF EXISTS public.variant_details CASCADE;

-- Drop triggers that reference variant tables
DROP TRIGGER IF EXISTS update_parent_item_quantity_trigger ON public.item_variants;
DROP TRIGGER IF EXISTS update_parent_item_quantity_v2_trigger ON public.item_variants;

-- Remove variant references from sales_order_items
ALTER TABLE public.sales_order_items DROP COLUMN IF EXISTS variant_id;

-- Drop variant-related tables with CASCADE (in correct order)
DROP TABLE IF EXISTS public.item_variant_attributes CASCADE;
DROP TABLE IF EXISTS public.item_variants CASCADE;

-- Force schema reload
NOTIFY pgrst, 'reload schema';