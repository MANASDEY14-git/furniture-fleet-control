-- Phase 1: Critical Data Access Controls - Part 1

-- 1. Restrict Supplier Access to store-based control
DROP POLICY IF EXISTS "Authenticated users can access suppliers" ON public.suppliers;
CREATE POLICY "Users can access suppliers for their stores" 
ON public.suppliers 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_store_access usa 
    WHERE usa.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Implement Store-Based Item Access
DROP POLICY IF EXISTS "Allow authenticated users to manage items" ON public.items;
CREATE POLICY "Users can access items for their stores" 
ON public.items 
FOR ALL 
USING (user_has_store_access(store_id));