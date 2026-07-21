-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on material_stock_movements" ON public.material_stock_movements;

-- Create a secure RLS policy that restricts access based on store ownership
-- Users can only access material stock movements for materials in stores they have access to
CREATE POLICY "Users can access material stock movements for their stores" 
ON public.material_stock_movements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.materials m 
    WHERE m.id = material_stock_movements.material_id 
    AND user_has_store_access(m.store_id)
  )
);

-- Ensure only authenticated users can perform operations
-- Revoke public access completely
REVOKE ALL ON public.material_stock_movements FROM public;
REVOKE ALL ON public.material_stock_movements FROM anon;

-- Grant proper access to authenticated users only
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_stock_movements TO authenticated;
GRANT ALL ON public.material_stock_movements TO service_role;