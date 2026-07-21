-- Force PostgREST schema reload by adding a harmless comment
COMMENT ON TABLE public.items IS 'Main items table for inventory management - schema reload trigger';