-- Phase 1: Critical Data Access Controls

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

-- 3. Secure Categories and Attributes (admin only for modifications, read for authenticated)
DROP POLICY IF EXISTS "Authenticated users can access categories" ON public.categories;
CREATE POLICY "Users can read categories" 
ON public.categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categories" 
ON public.categories 
FOR INSERT, UPDATE, DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Allow all operations on attributes" ON public.attributes;
CREATE POLICY "Users can read attributes" 
ON public.attributes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage attributes" 
ON public.attributes 
FOR INSERT, UPDATE, DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Allow all operations on attribute_values" ON public.attribute_values;
CREATE POLICY "Users can read attribute values" 
ON public.attribute_values 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage attribute values" 
ON public.attribute_values 
FOR INSERT, UPDATE, DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Restrict Audit Trail Access to admin users only
DROP POLICY IF EXISTS "Allow authenticated users to read audit records" ON public.audit_trails;
DROP POLICY IF EXISTS "Allow authenticated users to insert audit records" ON public.audit_trails;
CREATE POLICY "Only admins can read audit trails" 
ON public.audit_trails 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit records" 
ON public.audit_trails 
FOR INSERT 
WITH CHECK (true); -- Allow system triggers to insert

-- 5. Secure Material Stock Movements with store-based access
DROP POLICY IF EXISTS "Allow all operations on material_stock_movements" ON public.material_stock_movements;
CREATE POLICY "Users can access material movements for their stores" 
ON public.material_stock_movements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.materials m 
    WHERE m.id = material_id 
    AND user_has_store_access(m.store_id)
  )
);

-- 6. Secure Sales Customizations with proper access control
DROP POLICY IF EXISTS "Allow all operations on sales_customizations" ON public.sales_customizations;
CREATE POLICY "Users can access sales customizations for their stores" 
ON public.sales_customizations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.sales_orders so 
    WHERE so.id = sale_id 
    AND user_has_store_access(so.store_id)
  )
);