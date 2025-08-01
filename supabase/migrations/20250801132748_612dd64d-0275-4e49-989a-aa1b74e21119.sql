-- Force PostgREST schema reload by adding a comment to trigger cache refresh
COMMENT ON TABLE public.bom IS 'Bill of Materials table for managing product components';
COMMENT ON TABLE public.bom_components IS 'Components that make up a BOM';
COMMENT ON TABLE public.bom_component_options IS 'Customization options for BOM components';

-- Notify PostgREST of schema change
NOTIFY pgrst, 'reload schema';