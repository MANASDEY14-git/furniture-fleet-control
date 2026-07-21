-- Create secure RPC function to fetch a single order with items (PII-safe)
CREATE OR REPLACE FUNCTION public.get_sales_order_for_user(_order_id uuid)
RETURNS TABLE (
  id uuid,
  order_number text,
  store_id uuid,
  supplier_id uuid,
  date date,
  total_amount numeric,
  created_at timestamptz,
  updated_at timestamptz,
  delivery_status text,
  advance_paid numeric,
  customer_name text,
  customer_phone text,
  customer_address text,
  description text,
  status text,
  balance_due numeric,
  delivered_at timestamptz,
  delivery_date date,
  cancelled_at timestamptz,
  cancellation_reason text,
  sales_order_items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  can_see_pii boolean;
BEGIN
  -- Check if user can access this order's store
  IF NOT EXISTS (
    SELECT 1 FROM public.sales_orders so
    WHERE so.id = _order_id
    AND public.user_has_store_access(so.store_id)
  ) THEN
    RETURN; -- No rows returned = not found or no access
  END IF;

  -- Check PII access
  can_see_pii := public.can_access_customer_pii(auth.uid());

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
    CASE WHEN can_see_pii THEN so.customer_name ELSE 
      CASE WHEN so.customer_name IS NOT NULL THEN '***REDACTED***' ELSE NULL END
    END::text,
    CASE WHEN can_see_pii THEN so.customer_phone ELSE 
      CASE WHEN so.customer_phone IS NOT NULL THEN '***REDACTED***' ELSE NULL END
    END::text,
    CASE WHEN can_see_pii THEN so.customer_address ELSE 
      CASE WHEN so.customer_address IS NOT NULL THEN '***REDACTED***' ELSE NULL END
    END::text,
    so.description,
    so.status,
    so.balance_due,
    so.delivered_at,
    so.delivery_date,
    so.cancelled_at,
    so.cancellation_reason,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', soi.id,
        'order_id', soi.order_id,
        'item_id', soi.item_id,
        'item_name', soi.item_name,
        'quantity', soi.quantity,
        'unit_price', soi.unit_price,
        'total_price', soi.total_price,
        'supplier_id', soi.supplier_id,
        'variant_id', soi.variant_id,
        'stock_deducted', soi.stock_deducted,
        'created_at', soi.created_at
      ))
      FROM public.sales_order_items soi
      WHERE soi.order_id = so.id),
      '[]'::jsonb
    )
  FROM public.sales_orders so
  WHERE so.id = _order_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_sales_order_for_user(uuid) TO authenticated;