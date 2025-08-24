-- Add new roles for better granular access control
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_representative';

-- Create a function to check if user can access customer PII
CREATE OR REPLACE FUNCTION public.can_access_customer_pii(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager', 'sales_representative')
  );
$$;

-- Create a function to get redacted sales order data for non-privileged users
CREATE OR REPLACE FUNCTION public.get_sales_orders_secure(
  _store_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  id uuid,
  order_number text,
  store_id uuid,
  supplier_id uuid,
  date date,
  total_amount numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  delivery_status text,
  advance_paid numeric,
  customer_name text,
  customer_phone text,
  customer_address text,
  description text,
  status text,
  balance_due numeric,
  delivered_at timestamp with time zone,
  delivery_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user has access to customer PII
  IF public.can_access_customer_pii(_user_id) THEN
    -- Return full data including customer PII
    RETURN QUERY
    SELECT 
      so.id,
      so.order_number,
      so.store_id,
      so.supplier_id,
      so.date,
      so.total_amount,
      so.created_at,
      so.updated_at,
      so.delivery_status,
      so.advance_paid,
      so.customer_name,
      so.customer_phone,
      so.customer_address,
      so.description,
      so.status,
      so.balance_due,
      so.delivered_at,
      so.delivery_date
    FROM public.sales_orders so
    WHERE (_store_id IS NULL OR so.store_id = _store_id)
      AND public.user_has_store_access(so.store_id);
  ELSE
    -- Return redacted data for regular employees
    RETURN QUERY
    SELECT 
      so.id,
      so.order_number,
      so.store_id,
      so.supplier_id,
      so.date,
      so.total_amount,
      so.created_at,
      so.updated_at,
      so.delivery_status,
      so.advance_paid,
      CASE 
        WHEN so.customer_name IS NOT NULL THEN '***REDACTED***'
        ELSE NULL
      END::text as customer_name,
      CASE 
        WHEN so.customer_phone IS NOT NULL THEN '***REDACTED***'
        ELSE NULL
      END::text as customer_phone,
      CASE 
        WHEN so.customer_address IS NOT NULL THEN '***REDACTED***'
        ELSE NULL
      END::text as customer_address,
      so.description,
      so.status,
      so.balance_due,
      so.delivered_at,
      so.delivery_date
    FROM public.sales_orders so
    WHERE (_store_id IS NULL OR so.store_id = _store_id)
      AND public.user_has_store_access(so.store_id);
  END IF;
END;
$$;

-- Update the RLS policy for sales_orders to be more restrictive for customer PII
DROP POLICY IF EXISTS "Users can manage sales orders for their stores" ON public.sales_orders;

-- Create separate policies for different access levels
CREATE POLICY "Users can view sales orders with PII restriction"
ON public.sales_orders
FOR SELECT
USING (
  public.user_has_store_access(store_id) AND (
    public.can_access_customer_pii(auth.uid()) OR 
    (customer_name IS NULL AND customer_phone IS NULL AND customer_address IS NULL)
  )
);

CREATE POLICY "Privileged users can view all sales order data"
ON public.sales_orders
FOR SELECT
USING (
  public.user_has_store_access(store_id) AND 
  public.can_access_customer_pii(auth.uid())
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

-- Create a secure view for sales orders that automatically handles PII redaction
CREATE OR REPLACE VIEW public.sales_orders_secure AS
SELECT * FROM public.get_sales_orders_secure();

-- Grant necessary permissions
GRANT SELECT ON public.sales_orders_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_orders_secure(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_customer_pii(uuid) TO authenticated;