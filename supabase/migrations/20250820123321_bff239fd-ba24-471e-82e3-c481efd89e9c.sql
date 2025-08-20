-- Fix material_purchases grants
GRANT ALL PRIVILEGES ON public.material_purchases TO authenticated, service_role;
GRANT SELECT ON public.material_purchases TO anon;

-- Add material_purchases to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.material_purchases;

-- Ensure material_purchases has proper replica identity for realtime
ALTER TABLE public.material_purchases REPLICA IDENTITY FULL;