-- Remove item variants system completely

-- Drop all variant-related functions first
DROP FUNCTION IF EXISTS public.create_item_variant_direct(uuid, text, integer, numeric, numeric, uuid[]);
DROP FUNCTION IF EXISTS public.update_item_variant_direct(uuid, text, integer, numeric, numeric, uuid[]);
DROP FUNCTION IF EXISTS public.delete_item_variant_direct(uuid);
DROP FUNCTION IF EXISTS public.get_item_variants_with_attributes(uuid);

-- Drop triggers that reference variant tables
DROP TRIGGER IF EXISTS update_parent_item_quantity_trigger ON public.item_variants;
DROP TRIGGER IF EXISTS update_parent_item_quantity_v2_trigger ON public.item_variants;

-- Remove variant references from sales_order_items
ALTER TABLE public.sales_order_items DROP COLUMN IF EXISTS variant_id;

-- Drop variant-related tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.item_variant_attributes;
DROP TABLE IF EXISTS public.item_variants;

-- Drop the variant_details view
DROP VIEW IF EXISTS public.variant_details;

-- Remove any variant-related columns from other tables
-- Check if purchases table has variant_id in items jsonb - we'll handle this in code

-- Force schema reload
NOTIFY pgrst, 'reload schema';