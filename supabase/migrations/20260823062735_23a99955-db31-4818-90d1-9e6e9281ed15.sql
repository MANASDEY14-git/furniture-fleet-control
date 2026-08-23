ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS credit_limit numeric NOT NULL DEFAULT 0;

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS delivery_delay_reason text;

-- Receivables aging per customer -------------------------------------------
CREATE OR REPLACE FUNCTION public.get_receivables_aging(_store_id uuid)
RETURNS TABLE(
  customer_id uuid,
  customer_name text,
  customer_phone text,
  credit_limit numeric,
  open_orders bigint,
  total_billed numeric,
  total_collected numeric,
  outstanding numeric,
  oldest_unpaid_date date,
  oldest_age_days integer,
  bucket_0_30 numeric,
  bucket_31_60 numeric,
  bucket_61_90 numeric,
  bucket_90_plus numeric,
  last_followup_at timestamp with time zone,
  last_note text,
  next_action_date date
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied for this store';
  END IF;

  RETURN QUERY
  WITH open_orders AS (
    SELECT so.id,
           so.customer_id,
           COALESCE(NULLIF(TRIM(so.customer_name), ''), 'Walk-in customer') AS customer_name,
           so.customer_phone,
           so.date::date AS order_date,
           COALESCE(so.total_amount, 0) AS total_amount,
           COALESCE(so.advance_paid, 0) AS collected,
           COALESCE(so.balance_due, 0) AS balance_due,
           GREATEST((CURRENT_DATE - so.date::date), 0) AS age_days
    FROM public.sales_orders so
    WHERE so.store_id = _store_id
      AND COALESCE(so.document_type, 'order') = 'order'
      AND lower(COALESCE(so.delivery_status, '')) <> 'cancelled'
      AND lower(COALESCE(so.status, '')) <> 'cancelled'
      AND COALESCE(so.balance_due, 0) > 0
  ),
  followups AS (
    SELECT so.customer_id,
           MAX(f.created_at) AS last_followup_at,
           (ARRAY_AGG(f.note ORDER BY f.created_at DESC))[1] AS last_note,
           MAX(f.next_action_date) AS next_action_date
    FROM public.order_followups f
    JOIN public.sales_orders so ON so.id = f.order_id
    WHERE f.store_id = _store_id
    GROUP BY so.customer_id
  )
  SELECT o.customer_id,
         MIN(o.customer_name),
         MIN(o.customer_phone),
         COALESCE(MIN(c.credit_limit), 0),
         COUNT(*)::bigint,
         SUM(o.total_amount),
         SUM(o.collected),
         SUM(o.balance_due),
         MIN(o.order_date),
         MAX(o.age_days)::int,
         SUM(CASE WHEN o.age_days <= 30 THEN o.balance_due ELSE 0 END),
         SUM(CASE WHEN o.age_days BETWEEN 31 AND 60 THEN o.balance_due ELSE 0 END),
         SUM(CASE WHEN o.age_days BETWEEN 61 AND 90 THEN o.balance_due ELSE 0 END),
         SUM(CASE WHEN o.age_days > 90 THEN o.balance_due ELSE 0 END),
         MIN(f.last_followup_at),
         MIN(f.last_note),
         MIN(f.next_action_date)
  FROM open_orders o
  LEFT JOIN public.customers c ON c.id = o.customer_id
  LEFT JOIN followups f ON f.customer_id = o.customer_id
  GROUP BY o.customer_id
  ORDER BY 8 DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_receivables_aging(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_receivables_aging(uuid) TO authenticated;

-- Per-customer money summary ------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_customer_money_summary(_customer_id uuid)
RETURNS TABLE(
  total_billed numeric,
  total_collected numeric,
  outstanding numeric,
  credit_held numeric,
  credit_limit numeric,
  open_orders bigint,
  last_order_date date
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _store uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT c.store_id INTO _store FROM public.customers c WHERE c.id = _customer_id;
  IF _store IS NULL OR NOT public.user_has_store_access(_store) THEN
    RAISE EXCEPTION 'Access denied for this customer';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(so.total_amount), 0),
    COALESCE(SUM(so.advance_paid), 0),
    COALESCE(SUM(GREATEST(COALESCE(so.balance_due, 0), 0)), 0),
    public.get_customer_credit(_customer_id),
    COALESCE((SELECT c.credit_limit FROM public.customers c WHERE c.id = _customer_id), 0),
    COUNT(*) FILTER (WHERE COALESCE(so.balance_due, 0) > 0)::bigint,
    MAX(so.date)::date
  FROM public.sales_orders so
  WHERE so.customer_id = _customer_id
    AND lower(COALESCE(so.delivery_status, '')) <> 'cancelled'
    AND lower(COALESCE(so.status, '')) <> 'cancelled';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_customer_money_summary(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_customer_money_summary(uuid) TO authenticated;

-- Dispatch board -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dispatch_board(_store_id uuid)
RETURNS TABLE(
  order_id uuid,
  order_number text,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  customer_address text,
  order_date date,
  delivery_date date,
  delivery_status text,
  total_amount numeric,
  balance_due numeric,
  items_count bigint,
  bucket text,
  days_overdue integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied for this store';
  END IF;

  RETURN QUERY
  SELECT so.id,
         so.order_number,
         so.customer_id,
         COALESCE(NULLIF(TRIM(so.customer_name), ''), 'Walk-in customer'),
         so.customer_phone,
         so.customer_address,
         so.date::date,
         so.delivery_date::date,
         COALESCE(so.delivery_status, ''),
         COALESCE(so.total_amount, 0),
         COALESCE(so.balance_due, 0),
         (SELECT COUNT(*) FROM public.sales_order_items soi WHERE soi.order_id = so.id)::bigint,
         CASE
           WHEN so.delivery_date IS NULL THEN 'unscheduled'
           WHEN so.delivery_date::date < CURRENT_DATE THEN 'overdue'
           WHEN so.delivery_date::date = CURRENT_DATE THEN 'today'
           WHEN so.delivery_date::date <= CURRENT_DATE + 7 THEN 'this_week'
           ELSE 'later'
         END,
         CASE
           WHEN so.delivery_date IS NOT NULL AND so.delivery_date::date < CURRENT_DATE
             THEN (CURRENT_DATE - so.delivery_date::date)::int
           ELSE 0
         END
  FROM public.sales_orders so
  WHERE so.store_id = _store_id
    AND COALESCE(so.document_type, 'order') = 'order'
    AND lower(COALESCE(so.delivery_status, '')) NOT IN ('cancelled', 'delivered')
    AND lower(COALESCE(so.status, '')) <> 'cancelled'
  ORDER BY so.delivery_date NULLS LAST, so.date;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_dispatch_board(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dispatch_board(uuid) TO authenticated;

-- On-time delivery performance --------------------------------------------
CREATE OR REPLACE FUNCTION public.get_delivery_performance(_store_id uuid, _months integer DEFAULT 6)
RETURNS TABLE(
  month date,
  delivered_count bigint,
  on_time_count bigint,
  late_count bigint,
  on_time_rate numeric,
  avg_delay_days numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied for this store';
  END IF;

  RETURN QUERY
  WITH delivered AS (
    SELECT date_trunc('month', COALESCE(so.delivered_at::date, so.date::date))::date AS month,
           so.delivery_date::date AS promised,
           COALESCE(so.delivered_at::date, so.date::date) AS actual
    FROM public.sales_orders so
    WHERE so.store_id = _store_id
      AND lower(COALESCE(so.delivery_status, '')) = 'delivered'
      AND lower(COALESCE(so.status, '')) <> 'cancelled'
      AND COALESCE(so.delivered_at::date, so.date::date) >= (date_trunc('month', CURRENT_DATE) - (GREATEST(_months, 1) - 1) * INTERVAL '1 month')::date
  )
  SELECT d.month,
         COUNT(*)::bigint,
         COUNT(*) FILTER (WHERE d.promised IS NULL OR d.actual <= d.promised)::bigint,
         COUNT(*) FILTER (WHERE d.promised IS NOT NULL AND d.actual > d.promised)::bigint,
         ROUND(
           100.0 * COUNT(*) FILTER (WHERE d.promised IS NULL OR d.actual <= d.promised) / NULLIF(COUNT(*), 0)
         , 1),
         ROUND(COALESCE(AVG(GREATEST(d.actual - d.promised, 0)) FILTER (WHERE d.promised IS NOT NULL), 0), 1)
  FROM delivered d
  GROUP BY d.month
  ORDER BY d.month DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_delivery_performance(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_delivery_performance(uuid, integer) TO authenticated;