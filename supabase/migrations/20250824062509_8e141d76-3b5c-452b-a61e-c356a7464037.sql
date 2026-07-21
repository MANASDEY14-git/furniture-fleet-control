-- Drop the problematic view
DROP VIEW IF EXISTS public.sales_orders_secure;

-- Instead, we'll use the function directly and modify the application to call it
-- Create a wrapper function that's easier to use
CREATE OR REPLACE FUNCTION public.get_sales_orders_for_user(
  _store_id uuid DEFAULT NULL
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
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.get_sales_orders_secure(_store_id, auth.uid());
$$;