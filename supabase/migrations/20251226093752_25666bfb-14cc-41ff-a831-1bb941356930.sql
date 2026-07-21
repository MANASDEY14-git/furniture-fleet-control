-- Fix stores SELECT policy - allow users to see stores they have access to
DROP POLICY IF EXISTS "Users can view their assigned stores" ON public.stores;

CREATE POLICY "Users can view their assigned stores"
ON public.stores FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.store_id = stores.id
  )
  OR public.has_role(auth.uid(), 'admin')
);