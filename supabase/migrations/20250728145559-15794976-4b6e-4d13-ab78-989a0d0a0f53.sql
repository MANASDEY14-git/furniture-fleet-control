-- Fix the RLS policy for items table to allow inserts
DROP POLICY IF EXISTS "Users can access items for their stores" ON public.items;

CREATE POLICY "Users can access items for their stores" 
ON public.items 
FOR ALL 
USING (user_has_store_access(store_id))
WITH CHECK (user_has_store_access(store_id));