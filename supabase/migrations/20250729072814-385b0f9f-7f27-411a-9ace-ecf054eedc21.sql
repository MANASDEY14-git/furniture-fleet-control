-- Force complete PostgREST schema reload by recreating the items table comment
-- and refreshing all related objects

-- Update items table comment to force schema reload
COMMENT ON TABLE public.items IS 'Items inventory table - forcing PostgREST reload';

-- Recreate the foreign key constraint to force relationship recognition
ALTER TABLE public.item_variants DROP CONSTRAINT IF EXISTS item_variants_item_id_fkey;
ALTER TABLE public.item_variants 
ADD CONSTRAINT item_variants_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

-- Force PostgREST to recognize the table by updating its structure
ALTER TABLE public.item_variants ADD COLUMN IF NOT EXISTS temp_reload_col boolean DEFAULT NULL;
ALTER TABLE public.item_variants DROP COLUMN IF EXISTS temp_reload_col;

-- Refresh materialized views if any exist
DO $$
DECLARE
    view_name text;
BEGIN
    FOR view_name IN 
        SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
    LOOP
        EXECUTE 'REFRESH MATERIALIZED VIEW ' || view_name;
    END LOOP;
END $$;

-- Send a notification to force PostgREST schema reload
NOTIFY pgrst, 'reload schema';