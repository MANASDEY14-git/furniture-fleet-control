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