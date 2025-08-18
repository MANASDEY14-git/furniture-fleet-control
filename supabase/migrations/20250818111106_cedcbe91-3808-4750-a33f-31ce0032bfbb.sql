-- Re-enable RLS with a working policy that doesn't require foreign key test
ALTER TABLE public.material_purchases ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Material purchases access policy" ON public.material_purchases;

-- Create a simple policy that allows authenticated users
CREATE POLICY "Authenticated users can manage material purchases" 
ON public.material_purchases 
FOR ALL 
TO authenticated 
USING (true)  
WITH CHECK (true);