-- Update the RLS policy for sales_orders to be more restrictive for customer PII
DROP POLICY IF EXISTS "Users can manage sales orders for their stores" ON public.sales_orders;

-- Create new restrictive policies for different access levels
CREATE POLICY "Privileged users can view all sales order data"
ON public.sales_orders
FOR SELECT
USING (
  public.user_has_store_access(store_id) AND 
  public.can_access_customer_pii(auth.uid())
);

CREATE POLICY "Regular users can view orders without customer PII"
ON public.sales_orders
FOR SELECT
USING (
  public.user_has_store_access(store_id) AND 
  NOT public.can_access_customer_pii(auth.uid()) AND
  (customer_name IS NULL OR customer_name = '')
);

CREATE POLICY "Users can insert sales orders for their stores"
ON public.sales_orders
FOR INSERT
WITH CHECK (
  public.user_has_store_access(store_id)
);

CREATE POLICY "Privileged users can update sales orders"
ON public.sales_orders
FOR UPDATE
USING (
  public.user_has_store_access(store_id) AND
  public.can_access_customer_pii(auth.uid())
);

CREATE POLICY "Privileged users can delete sales orders"
ON public.sales_orders
FOR DELETE
USING (
  public.user_has_store_access(store_id) AND
  public.can_access_customer_pii(auth.uid())
);