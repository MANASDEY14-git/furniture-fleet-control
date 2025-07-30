-- Comprehensive script to remove all triggers from item_variants table
-- Run this script directly in your database to ensure all triggers are removed

-- First, let's check what triggers currently exist on item_variants table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'item_variants' 
AND trigger_schema = 'public';

-- Drop all known triggers that might exist on item_variants table
DROP TRIGGER IF EXISTS update_item_variants_updated_at ON public.item_variants;
DROP TRIGGER IF EXISTS update_parent_item_quantity_trigger ON public.item_variants;
DROP TRIGGER IF EXISTS update_parent_item_quantity_v2_trigger ON public.item_variants;
DROP TRIGGER IF EXISTS trigger_sync_parent_quantity ON public.item_variants;
DROP TRIGGER IF EXISTS sync_parent_item_quantity ON public.item_variants;
DROP TRIGGER IF EXISTS update_parent_item_quantity_on_variant_change ON public.item_variants;
DROP TRIGGER IF EXISTS item_variants_updated_at_trigger ON public.item_variants;
DROP TRIGGER IF EXISTS sync_variant_quantities_trigger ON public.item_variants;

-- Also drop any triggers that might reference item_variants from other tables
DROP TRIGGER IF EXISTS update_item_variants_from_items ON public.items;
DROP TRIGGER IF EXISTS sync_variant_quantities ON public.items;
DROP TRIGGER IF EXISTS items_updated_at_trigger ON public.items;

-- Drop any functions that might be used by these triggers
DROP FUNCTION IF EXISTS public.update_item_variants_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.sync_parent_item_quantity() CASCADE;
DROP FUNCTION IF EXISTS public.update_parent_item_quantity() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Check again to see if any triggers remain
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'item_variants' 
AND trigger_schema = 'public';

-- If any triggers still exist, drop them dynamically
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'item_variants' 
        AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON public.item_variants';
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Final check to confirm all triggers are removed
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'item_variants' 
AND trigger_schema = 'public';

-- Force schema reload to ensure all changes are applied
NOTIFY pgrst, 'reload schema'; 