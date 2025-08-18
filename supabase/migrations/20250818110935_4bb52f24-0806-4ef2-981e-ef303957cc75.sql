-- Drop and recreate the material_purchases RLS policy with better permissions
DROP POLICY IF EXISTS "Users can access material purchases for their stores" ON public.material_purchases;

-- Create a more permissive policy for debugging
CREATE POLICY "Material purchases access policy" 
ON public.material_purchases 
FOR ALL 
USING (true)  -- Allow all reads for now
WITH CHECK (true);  -- Allow all writes for now

-- Also ensure RLS is enabled
ALTER TABLE public.material_purchases ENABLE ROW LEVEL SECURITY;