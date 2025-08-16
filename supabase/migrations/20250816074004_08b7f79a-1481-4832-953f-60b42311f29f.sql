-- Grant current admin users access to all stores
INSERT INTO public.user_store_access (user_id, store_id)
SELECT DISTINCT ur.user_id, s.id
FROM public.user_roles ur
CROSS JOIN public.stores s
WHERE ur.role = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM public.user_store_access usa
  WHERE usa.user_id = ur.user_id AND usa.store_id = s.id
);

-- Update the material_purchases RLS policy to be more permissive for debugging
DROP POLICY IF EXISTS "Users can access material purchases for their stores" ON public.material_purchases;

CREATE POLICY "Users can access material purchases for their stores" 
ON public.material_purchases 
FOR ALL 
USING (
  -- Allow if user has store access OR if user is admin
  user_has_store_access(store_id) OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
) 
WITH CHECK (
  -- Same check for inserts
  user_has_store_access(store_id) OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);