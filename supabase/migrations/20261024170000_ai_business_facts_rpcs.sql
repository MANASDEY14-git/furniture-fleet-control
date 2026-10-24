-- Shared Business Facts RPCs for AI Agents
-- Ensures all agents and assistants query one canonical, trustworthy set of facts
-- matching Collections, Dispatch, and Reorder pages exactly.

-- 1. Ensure existing base RPCs allow service_role and postgres execution
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(auth.role(), '') <> 'service_role' AND current_user <> 'postgres') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.user_has_store_access(_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
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
      AND lower(COALESCE(status, '')) <> 'cancelled'
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
$$;

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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(auth.role(), '') <> 'service_role' AND current_user <> 'postgres') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.user_has_store_access(_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
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
$$;

CREATE OR REPLACE FUNCTION public.get_followup_worklist(_store_id uuid)
RETURNS TABLE(
  order_id uuid,
  order_number text,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  order_date date,
  delivery_date date,
  total_amount numeric,
  collected numeric,
  balance_due numeric,
  delivery_status text,
  document_type text,
  quote_status text,
  kind text,
  age_days integer,
  age_bucket text,
  priority numeric,
  last_note text,
  last_followup_at timestamp with time zone,
  last_followup_by text,
  next_action_date date,
  snooze_until date,
  snoozed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(auth.role(), '') <> 'service_role' AND current_user <> 'postgres') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.user_has_store_access(_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT so.id,
           so.order_number,
           so.customer_id,
           so.customer_name,
           so.customer_phone,
           so.date::date AS order_date,
           so.delivery_date::date AS delivery_date,
           COALESCE(so.total_amount, 0) AS total_amount,
           COALESCE((SELECT SUM(p.amount) FROM public.payments p
                     WHERE p.sale_id = so.id AND p.type = 'Receipt'), 0) AS collected,
           COALESCE(so.balance_due, 0) AS balance_due,
           COALESCE(so.delivery_status, '') AS delivery_status,
           COALESCE(so.document_type, 'order') AS document_type,
           so.quote_status,
           GREATEST((CURRENT_DATE - so.date::date), 0) AS age_days
    FROM public.sales_orders so
    WHERE so.store_id = _store_id
      AND lower(COALESCE(so.delivery_status, '')) <> 'cancelled'
      AND lower(COALESCE(so.status, '')) <> 'cancelled'
  ),
  classified AS (
    SELECT b.*,
      CASE
        WHEN b.document_type = 'quote'
             AND lower(COALESCE(b.quote_status, 'draft')) IN ('draft', 'sent')
             AND b.age_days >= 3 THEN 'quote_cold'
        WHEN b.document_type = 'order'
             AND b.balance_due > 0
             AND lower(b.delivery_status) = 'delivered' THEN 'collection'
        WHEN b.document_type = 'order'
             AND b.balance_due <= 0
             AND lower(b.delivery_status) <> 'delivered' THEN 'paid_undelivered'
        WHEN b.document_type = 'order'
             AND b.delivery_date IS NOT NULL
             AND b.delivery_date < CURRENT_DATE
             AND lower(b.delivery_status) <> 'delivered' THEN 'delivery_slipping'
        WHEN b.document_type = 'order'
             AND b.balance_due > 0 THEN 'collection'
        ELSE NULL
      END AS kind
    FROM base b
  ),
  latest AS (
    SELECT f.order_id,
           (ARRAY_AGG(f.note ORDER BY f.created_at DESC))[1] AS last_note,
           (ARRAY_AGG(f.created_by ORDER BY f.created_at DESC))[1] AS last_created_by,
           MAX(f.created_at) AS last_followup_at,
           MAX(f.next_action_date) AS next_action_date,
           MAX(f.snooze_until) AS snooze_until
    FROM public.order_followups f
    WHERE f.store_id = _store_id
    GROUP BY f.order_id
  )
  SELECT c.id,
         c.order_number,
         c.customer_id,
         c.customer_name,
         c.customer_phone,
         c.order_date,
         c.delivery_date,
         c.total_amount,
         c.collected,
         c.balance_due,
         c.delivery_status,
         c.document_type,
         c.quote_status,
         c.kind,
         c.age_days::int,
         CASE
           WHEN c.age_days <= 7 THEN '0-7'
           WHEN c.age_days <= 30 THEN '8-30'
           ELSE '30+'
         END AS age_bucket,
         ROUND(
           (CASE c.kind
              WHEN 'paid_undelivered' THEN 400
              WHEN 'delivery_slipping' THEN 300
              WHEN 'collection' THEN 200
              ELSE 100
            END)
           + LEAST(c.age_days, 180)
           + LEAST(GREATEST(c.balance_due, 0) / 1000.0, 200)
         , 2) AS priority,
         l.last_note,
         l.last_followup_at,
         NULLIF(TRIM(CONCAT_WS(' ', pr.first_name, pr.last_name)), '') AS last_followup_by,
         l.next_action_date,
         l.snooze_until,
         COALESCE(l.snooze_until > CURRENT_DATE, false) AS snoozed
  FROM classified c
  LEFT JOIN latest l ON l.order_id = c.id
  LEFT JOIN public.profiles pr ON pr.user_id = l.last_created_by
  WHERE c.kind IS NOT NULL
  ORDER BY COALESCE(l.snooze_until > CURRENT_DATE, false) ASC, 17 DESC;
END;
$$;

-- 2. New AI Shared Fact RPCs

-- 2.1 ai_get_receivables
CREATE OR REPLACE FUNCTION public.ai_get_receivables(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_name text;
  _total_due numeric := 0;
  _total_customers int := 0;
  _total_orders int := 0;
  _b0_30 numeric := 0;
  _b31_60 numeric := 0;
  _b61_90 numeric := 0;
  _b90_plus numeric := 0;
  _customers jsonb := '[]'::jsonb;
BEGIN
  IF (COALESCE(auth.role(), '') <> 'service_role' AND current_user <> 'postgres') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.user_has_store_access(_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
  END IF;

  SELECT name INTO _store_name FROM public.stores WHERE id = _store_id;

  WITH aging_data AS (
    SELECT * FROM public.get_receivables_aging(_store_id)
  )
  SELECT
    COALESCE(SUM(outstanding), 0),
    COUNT(*)::int,
    COALESCE(SUM(open_orders), 0)::int,
    COALESCE(SUM(bucket_0_30), 0),
    COALESCE(SUM(bucket_31_60), 0),
    COALESCE(SUM(bucket_61_90), 0),
    COALESCE(SUM(bucket_90_plus), 0),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'customer_id', customer_id,
        'customer_name', customer_name,
        'customer_phone', customer_phone,
        'credit_limit', credit_limit,
        'open_orders', open_orders,
        'total_billed', total_billed,
        'total_collected', total_collected,
        'outstanding', outstanding,
        'oldest_unpaid_date', oldest_unpaid_date,
        'oldest_age_days', oldest_age_days,
        'bucket_0_30', bucket_0_30,
        'bucket_31_60', bucket_31_60,
        'bucket_61_90', bucket_61_90,
        'bucket_90_plus', bucket_90_plus,
        'last_followup_at', last_followup_at,
        'last_note', last_note,
        'next_action_date', next_action_date
      ) ORDER BY outstanding DESC
    ), '[]'::jsonb)
  INTO
    _total_due,
    _total_customers,
    _total_orders,
    _b0_30,
    _b31_60,
    _b61_90,
    _b90_plus,
    _customers
  FROM aging_data;

  RETURN jsonb_build_object(
    'store_id', _store_id,
    'store_name', COALESCE(_store_name, 'Unknown Store'),
    'as_of', now(),
    'scope', 'all open active orders as of today (excluding quotes and cancelled orders)',
    'total_due', _total_due,
    'total_customers_with_dues', _total_customers,
    'total_open_orders', _total_orders,
    'aging_buckets', jsonb_build_object(
      'bucket_0_30', _b0_30,
      'bucket_31_60', _b31_60,
      'bucket_61_90', _b61_90,
      'bucket_90_plus', _b90_plus
    ),
    'customers', _customers
  );
END;
$$;

-- 2.2 ai_get_sales_summary
CREATE OR REPLACE FUNCTION public.ai_get_sales_summary(
  _store_id uuid,
  _from_date date DEFAULT NULL,
  _to_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_name text;
  _effective_from date;
  _effective_to date;
  _total_orders int := 0;
  _total_revenue numeric := 0;
  _total_collected numeric := 0;
  _total_balance_due numeric := 0;
  _delivered_count int := 0;
  _pending_count int := 0;
  _shipped_count int := 0;
  _cancelled_count int := 0;
  _top_products jsonb := '[]'::jsonb;
  _top_customers jsonb := '[]'::jsonb;
  _this_month_start date := date_trunc('month', CURRENT_DATE)::date;
  _this_month_end date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
  _last_month_start date := (date_trunc('month', CURRENT_DATE) - interval '1 month')::date;
  _last_month_end date := (date_trunc('month', CURRENT_DATE) - interval '1 day')::date;
  _this_month_orders int := 0;
  _this_month_revenue numeric := 0;
  _last_month_orders int := 0;
  _last_month_revenue numeric := 0;
BEGIN
  IF (COALESCE(auth.role(), '') <> 'service_role' AND current_user <> 'postgres') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.user_has_store_access(_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
  END IF;

  SELECT name INTO _store_name FROM public.stores WHERE id = _store_id;

  _effective_from := COALESCE(_from_date, _this_month_start);
  _effective_to := COALESCE(_to_date, _this_month_end);

  SELECT COUNT(*) INTO _cancelled_count
  FROM public.sales_orders
  WHERE store_id = _store_id
    AND date >= _effective_from AND date <= _effective_to
    AND (lower(COALESCE(delivery_status, '')) = 'cancelled' OR lower(COALESCE(status, '')) = 'cancelled');

  WITH active_sales AS (
    SELECT id, order_number, customer_name, total_amount, advance_paid, balance_due, delivery_status, date
    FROM public.sales_orders
    WHERE store_id = _store_id
      AND date >= _effective_from AND date <= _effective_to
      AND COALESCE(document_type, 'order') = 'order'
      AND lower(COALESCE(delivery_status, '')) <> 'cancelled'
      AND lower(COALESCE(status, '')) <> 'cancelled'
  )
  SELECT
    COUNT(*)::int,
    COALESCE(SUM(total_amount), 0),
    COALESCE(SUM(advance_paid), 0),
    COALESCE(SUM(balance_due), 0),
    COUNT(*) FILTER (WHERE lower(COALESCE(delivery_status, '')) = 'delivered')::int,
    COUNT(*) FILTER (WHERE lower(COALESCE(delivery_status, '')) IN ('pending', 'processing'))::int,
    COUNT(*) FILTER (WHERE lower(COALESCE(delivery_status, '')) = 'shipped')::int
  INTO
    _total_orders,
    _total_revenue,
    _total_collected,
    _total_balance_due,
    _delivered_count,
    _pending_count,
    _shipped_count
  FROM active_sales;

  WITH period_items AS (
    SELECT
      COALESCE(soi.item_name, i.name, 'Unknown Item') as item_name,
      SUM(soi.quantity) as qty_sold,
      SUM(soi.total_price) as revenue
    FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    LEFT JOIN public.items i ON i.id = soi.item_id
    WHERE so.store_id = _store_id
      AND so.date >= _effective_from AND so.date <= _effective_to
      AND COALESCE(so.document_type, 'order') = 'order'
      AND lower(COALESCE(so.delivery_status, '')) <> 'cancelled'
      AND lower(COALESCE(so.status, '')) <> 'cancelled'
    GROUP BY COALESCE(soi.item_name, i.name, 'Unknown Item')
    ORDER BY qty_sold DESC
    LIMIT 5
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'item_name', item_name,
    'quantity_sold', qty_sold,
    'revenue', revenue
  )), '[]'::jsonb)
  INTO _top_products
  FROM period_items;

  WITH period_customers AS (
    SELECT
      COALESCE(NULLIF(TRIM(customer_name), ''), 'Walk-in customer') as customer_name,
      COUNT(*)::int as orders_count,
      SUM(total_amount) as total_spent
    FROM public.sales_orders
    WHERE store_id = _store_id
      AND date >= _effective_from AND date <= _effective_to
      AND COALESCE(document_type, 'order') = 'order'
      AND lower(COALESCE(delivery_status, '')) <> 'cancelled'
      AND lower(COALESCE(status, '')) <> 'cancelled'
    GROUP BY COALESCE(NULLIF(TRIM(customer_name), ''), 'Walk-in customer')
    ORDER BY total_spent DESC
    LIMIT 5
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'customer_name', customer_name,
    'orders_count', orders_count,
    'total_spent', total_spent
  )), '[]'::jsonb)
  INTO _top_customers
  FROM period_customers;

  SELECT
    COUNT(*)::int, COALESCE(SUM(total_amount), 0)
  INTO _this_month_orders, _this_month_revenue
  FROM public.sales_orders
  WHERE store_id = _store_id
    AND date >= _this_month_start AND date <= _this_month_end
    AND COALESCE(document_type, 'order') = 'order'
    AND lower(COALESCE(delivery_status, '')) <> 'cancelled'
    AND lower(COALESCE(status, '')) <> 'cancelled';

  SELECT
    COUNT(*)::int, COALESCE(SUM(total_amount), 0)
  INTO _last_month_orders, _last_month_revenue
  FROM public.sales_orders
  WHERE store_id = _store_id
    AND date >= _last_month_start AND date <= _last_month_end
    AND COALESCE(document_type, 'order') = 'order'
    AND lower(COALESCE(delivery_status, '')) <> 'cancelled'
    AND lower(COALESCE(status, '')) <> 'cancelled';

  RETURN jsonb_build_object(
    'store_id', _store_id,
    'store_name', COALESCE(_store_name, 'Unknown Store'),
    'as_of', now(),
    'period', jsonb_build_object(
      'from_date', _effective_from,
      'to_date', _effective_to
    ),
    'total_orders', _total_orders,
    'total_revenue', _total_revenue,
    'total_collected', _total_collected,
    'total_balance_due', _total_balance_due,
    'delivered_orders', _delivered_count,
    'pending_orders', _pending_count,
    'shipped_orders', _shipped_count,
    'cancelled_orders_excluded', _cancelled_count,
    'top_products', _top_products,
    'top_customers', _top_customers,
    'comparisons', jsonb_build_object(
      'this_month', jsonb_build_object(
        'from', _this_month_start,
        'to', _this_month_end,
        'orders_count', _this_month_orders,
        'revenue', _this_month_revenue
      ),
      'last_month', jsonb_build_object(
        'from', _last_month_start,
        'to', _last_month_end,
        'orders_count', _last_month_orders,
        'revenue', _last_month_revenue
      )
    )
  );
END;
$$;

-- 2.3 ai_get_cash_position
CREATE OR REPLACE FUNCTION public.ai_get_cash_position(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_name text;
  _total_balance numeric := 0;
  _accounts_count int := 0;
  _accounts jsonb := '[]'::jsonb;
BEGIN
  IF (COALESCE(auth.role(), '') <> 'service_role' AND current_user <> 'postgres') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.user_has_store_access(_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    ) THEN
      RAISE EXCEPTION 'Access denied: Financial data requires manager, accountant, or admin role';
    END IF;
  END IF;

  SELECT name INTO _store_name FROM public.stores WHERE id = _store_id;

  SELECT
    COALESCE(SUM(current_balance), 0),
    COUNT(*)::int,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'account_name', account_name,
        'bank_name', bank_name,
        'account_number', account_number,
        'account_type', account_type,
        'current_balance', COALESCE(current_balance, 0),
        'is_active', is_active
      ) ORDER BY current_balance DESC
    ), '[]'::jsonb)
  INTO _total_balance, _accounts_count, _accounts
  FROM public.bank_accounts
  WHERE store_id = _store_id;

  RETURN jsonb_build_object(
    'store_id', _store_id,
    'store_name', COALESCE(_store_name, 'Unknown Store'),
    'as_of', now(),
    'total_cash_and_bank', _total_balance,
    'accounts_count', _accounts_count,
    'accounts', _accounts
  );
END;
$$;

-- 2.4 ai_get_payables
CREATE OR REPLACE FUNCTION public.ai_get_payables(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_name text;
  _total_payable numeric := 0;
  _total_advance numeric := 0;
  _net_balance numeric := 0;
  _suppliers_due_count int := 0;
  _suppliers_advance_count int := 0;
  _suppliers_due jsonb := '[]'::jsonb;
  _suppliers_advance jsonb := '[]'::jsonb;
BEGIN
  IF (COALESCE(auth.role(), '') <> 'service_role' AND current_user <> 'postgres') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.user_has_store_access(_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    ) THEN
      RAISE EXCEPTION 'Access denied: Financial data requires manager, accountant, or admin role';
    END IF;
  END IF;

  SELECT name INTO _store_name FROM public.stores WHERE id = _store_id;

  WITH store_suppliers AS (
    SELECT DISTINCT s.id as supplier_id, s.name as supplier_name, s.contact_person, s.phone
    FROM public.suppliers s
  ),
  ledger_sums AS (
    SELECT 
      supplier_id,
      COALESCE(SUM(debit_amount), 0) as total_debit,
      COALESCE(SUM(credit_amount), 0) as total_credit
    FROM public.supplier_ledger
    WHERE store_id = _store_id
    GROUP BY supplier_id
  ),
  opening_sums AS (
    SELECT 
      supplier_id,
      COALESCE(SUM(CASE WHEN balance_type = 'debit' THEN opening_balance ELSE -opening_balance END), 0) as opening_val
    FROM public.supplier_opening_balances
    WHERE store_id = _store_id
    GROUP BY supplier_id
  ),
  computed AS (
    SELECT 
      ss.supplier_id,
      ss.supplier_name,
      ss.contact_person,
      ss.phone,
      COALESCE(os.opening_val, 0) as opening_balance,
      COALESCE(ls.total_debit, 0) as total_purchases_debit,
      COALESCE(ls.total_credit, 0) as total_payments_credit,
      (COALESCE(os.opening_val, 0) + COALESCE(ls.total_debit, 0) - COALESCE(ls.total_credit, 0)) as balance
    FROM store_suppliers ss
    LEFT JOIN ledger_sums ls ON ls.supplier_id = ss.supplier_id
    LEFT JOIN opening_sums os ON os.supplier_id = ss.supplier_id
    WHERE (COALESCE(os.opening_val, 0) != 0 OR COALESCE(ls.total_debit, 0) != 0 OR COALESCE(ls.total_credit, 0) != 0)
  )
  SELECT
    COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN balance < 0 THEN -balance ELSE 0 END), 0),
    COALESCE(SUM(balance), 0),
    COUNT(*) FILTER (WHERE balance > 0)::int,
    COUNT(*) FILTER (WHERE balance < 0)::int,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'supplier_id', supplier_id,
        'supplier_name', supplier_name,
        'contact_person', contact_person,
        'phone', phone,
        'amount_owed', balance,
        'opening_balance', opening_balance,
        'total_purchases', total_purchases_debit,
        'total_payments', total_payments_credit
      ) ORDER BY balance DESC
    ) FILTER (WHERE balance > 0), '[]'::jsonb),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'supplier_id', supplier_id,
        'supplier_name', supplier_name,
        'contact_person', contact_person,
        'phone', phone,
        'advance_amount', -balance,
        'opening_balance', opening_balance,
        'total_purchases', total_purchases_debit,
        'total_payments', total_payments_credit
      ) ORDER BY (-balance) DESC
    ) FILTER (WHERE balance < 0), '[]'::jsonb)
  INTO
    _total_payable,
    _total_advance,
    _net_balance,
    _suppliers_due_count,
    _suppliers_advance_count,
    _suppliers_due,
    _suppliers_advance
  FROM computed;

  RETURN jsonb_build_object(
    'store_id', _store_id,
    'store_name', COALESCE(_store_name, 'Unknown Store'),
    'as_of', now(),
    'total_payable_to_suppliers', _total_payable,
    'total_advances_paid_to_suppliers', _total_advance,
    'net_balance', _net_balance,
    'suppliers_with_dues_count', _suppliers_due_count,
    'suppliers_with_advance_count', _suppliers_advance_count,
    'suppliers_we_owe', _suppliers_due,
    'suppliers_with_advances', _suppliers_advance
  );
END;
$$;

-- 2.5 ai_get_stock_status
CREATE OR REPLACE FUNCTION public.ai_get_stock_status(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_name text;
  _total_items int := 0;
  _out_of_stock_count int := 0;
  _low_stock_count int := 0;
  _total_stock_value numeric := 0;
  _urgent_reorders_count int := 0;
  _reorder_soon_count int := 0;
  _dead_stock_count int := 0;
  _dead_stock_value numeric := 0;
  _never_sold_count int := 0;
  _never_sold_value numeric := 0;
  _low_confidence_count int := 0;
  _top_urgent_reorders jsonb := '[]'::jsonb;
  _top_low_stock jsonb := '[]'::jsonb;
BEGIN
  IF (COALESCE(auth.role(), '') <> 'service_role' AND current_user <> 'postgres') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.user_has_store_access(_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
  END IF;

  SELECT name INTO _store_name FROM public.stores WHERE id = _store_id;

  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE COALESCE(quantity_available, 0) <= 0)::int,
    COUNT(*) FILTER (WHERE COALESCE(quantity_available, 0) > 0 AND COALESCE(quantity_available, 0) < 5)::int,
    COALESCE(SUM(COALESCE(quantity_available, 0) * COALESCE(cost_price, 0)), 0)
  INTO
    _total_items,
    _out_of_stock_count,
    _low_stock_count,
    _total_stock_value
  FROM public.items
  WHERE store_id = _store_id
    AND COALESCE(is_discontinued, false) = false;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'item_id', id,
      'item_name', name,
      'quantity_available', quantity_available,
      'cost_price', cost_price,
      'selling_price', selling_price
    ) ORDER BY quantity_available ASC, name ASC
  ), '[]'::jsonb)
  INTO _top_low_stock
  FROM (
    SELECT id, name, quantity_available, cost_price, selling_price
    FROM public.items
    WHERE store_id = _store_id
      AND COALESCE(is_discontinued, false) = false
      AND COALESCE(quantity_available, 0) < 5
    ORDER BY quantity_available ASC, name ASC
    LIMIT 10
  ) ls;

  WITH reorder_data AS (
    SELECT * FROM public.get_reorder_intelligence(_store_id, 365)
  )
  SELECT
    COUNT(*) FILTER (WHERE decision = 'reorder_now' AND confidence <> 'low')::int,
    COUNT(*) FILTER (WHERE decision = 'reorder_soon')::int,
    COUNT(*) FILTER (WHERE decision = 'dead_stock')::int,
    COALESCE(SUM(stock_value) FILTER (WHERE decision = 'dead_stock'), 0),
    COUNT(*) FILTER (WHERE decision = 'never_sold')::int,
    COALESCE(SUM(stock_value) FILTER (WHERE decision = 'never_sold'), 0),
    COUNT(*) FILTER (WHERE confidence = 'low')::int,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'item_id', item_id,
        'item_name', item_name,
        'current_stock', current_stock,
        'open_demand', open_demand,
        'suggested_qty', suggested_qty,
        'suggested_order_cost', suggested_order_cost,
        'supplier_name', supplier_name,
        'confidence', confidence,
        'evidence_sentence', evidence_sentence
      ) ORDER BY suggested_order_cost DESC
    ) FILTER (WHERE decision = 'reorder_now' AND confidence <> 'low'), '[]'::jsonb)
  INTO
    _urgent_reorders_count,
    _reorder_soon_count,
    _dead_stock_count,
    _dead_stock_value,
    _never_sold_count,
    _never_sold_value,
    _low_confidence_count,
    _top_urgent_reorders
  FROM reorder_data;

  RETURN jsonb_build_object(
    'store_id', _store_id,
    'store_name', COALESCE(_store_name, 'Unknown Store'),
    'as_of', now(),
    'catalog_items_count', _total_items,
    'out_of_stock_count', _out_of_stock_count,
    'low_stock_count_under_5', _low_stock_count,
    'total_stock_value', _total_stock_value,
    'reorder_intelligence', jsonb_build_object(
      'urgent_reorders_count', _urgent_reorders_count,
      'reorder_soon_count', _reorder_soon_count,
      'dead_stock_count', _dead_stock_count,
      'dead_stock_locked_value', _dead_stock_value,
      'never_sold_count', _never_sold_count,
      'never_sold_locked_value', _never_sold_value,
      'low_confidence_count', _low_confidence_count
    ),
    'urgent_reorders', COALESCE(_top_urgent_reorders, '[]'::jsonb),
    'low_stock_items', COALESCE(_top_low_stock, '[]'::jsonb)
  );
END;
$$;

-- 2.6 ai_get_deliveries
CREATE OR REPLACE FUNCTION public.ai_get_deliveries(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_name text;
  _total_pending int := 0;
  _overdue_count int := 0;
  _today_count int := 0;
  _this_week_count int := 0;
  _unscheduled_count int := 0;
  _later_count int := 0;
  _overdue_deliveries jsonb := '[]'::jsonb;
  _upcoming_deliveries jsonb := '[]'::jsonb;
BEGIN
  IF (COALESCE(auth.role(), '') <> 'service_role' AND current_user <> 'postgres') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.user_has_store_access(_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
  END IF;

  SELECT name INTO _store_name FROM public.stores WHERE id = _store_id;

  WITH dispatch_data AS (
    SELECT * FROM public.get_dispatch_board(_store_id)
  )
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE bucket = 'overdue')::int,
    COUNT(*) FILTER (WHERE bucket = 'today')::int,
    COUNT(*) FILTER (WHERE bucket = 'this_week')::int,
    COUNT(*) FILTER (WHERE bucket = 'unscheduled')::int,
    COUNT(*) FILTER (WHERE bucket = 'later')::int,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'order_id', order_id,
        'order_number', order_number,
        'customer_name', customer_name,
        'customer_phone', customer_phone,
        'order_date', order_date,
        'delivery_date', delivery_date,
        'delivery_status', delivery_status,
        'days_overdue', days_overdue,
        'total_amount', total_amount,
        'balance_due', balance_due,
        'items_count', items_count
      ) ORDER BY days_overdue DESC
    ) FILTER (WHERE bucket = 'overdue'), '[]'::jsonb),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'order_id', order_id,
        'order_number', order_number,
        'customer_name', customer_name,
        'customer_phone', customer_phone,
        'delivery_date', delivery_date,
        'bucket', bucket,
        'total_amount', total_amount,
        'balance_due', balance_due
      ) ORDER BY delivery_date ASC
    ) FILTER (WHERE bucket IN ('today', 'this_week')), '[]'::jsonb)
  INTO
    _total_pending,
    _overdue_count,
    _today_count,
    _this_week_count,
    _unscheduled_count,
    _later_count,
    _overdue_deliveries,
    _upcoming_deliveries
  FROM dispatch_data;

  RETURN jsonb_build_object(
    'store_id', _store_id,
    'store_name', COALESCE(_store_name, 'Unknown Store'),
    'as_of', now(),
    'total_undelivered_orders', _total_pending,
    'overdue_count', _overdue_count,
    'today_count', _today_count,
    'this_week_count', _this_week_count,
    'unscheduled_count', _unscheduled_count,
    'later_count', _later_count,
    'late_overdue_deliveries', _overdue_deliveries,
    'upcoming_deliveries', _upcoming_deliveries
  );
END;
$$;

-- 2.7 ai_get_followups
CREATE OR REPLACE FUNCTION public.ai_get_followups(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store_name text;
  _total_followups int := 0;
  _collection_count int := 0;
  _delivery_slipping_count int := 0;
  _paid_undelivered_count int := 0;
  _quote_cold_count int := 0;
  _overdue_count int := 0;
  _worklist jsonb := '[]'::jsonb;
BEGIN
  IF (COALESCE(auth.role(), '') <> 'service_role' AND current_user <> 'postgres') THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT public.user_has_store_access(_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
  END IF;

  SELECT name INTO _store_name FROM public.stores WHERE id = _store_id;

  WITH followups_data AS (
    SELECT * FROM public.get_followup_worklist(_store_id)
  )
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE kind = 'collection')::int,
    COUNT(*) FILTER (WHERE kind = 'delivery_slipping')::int,
    COUNT(*) FILTER (WHERE kind = 'paid_undelivered')::int,
    COUNT(*) FILTER (WHERE kind = 'quote_cold')::int,
    COUNT(*) FILTER (WHERE next_action_date < CURRENT_DATE)::int,
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'order_id', order_id,
        'order_number', order_number,
        'customer_name', customer_name,
        'customer_phone', customer_phone,
        'kind', kind,
        'priority', priority,
        'order_date', order_date,
        'total_amount', total_amount,
        'collected', collected,
        'balance_due', balance_due,
        'delivery_status', delivery_status,
        'delivery_date', delivery_date,
        'age_days', age_days,
        'next_action_date', next_action_date,
        'last_note', last_note,
        'last_followup_at', last_followup_at,
        'last_followup_by', last_followup_by,
        'snoozed', snoozed
      ) ORDER BY priority DESC
    ), '[]'::jsonb)
  INTO
    _total_followups,
    _collection_count,
    _delivery_slipping_count,
    _paid_undelivered_count,
    _quote_cold_count,
    _overdue_count,
    _worklist
  FROM followups_data;

  RETURN jsonb_build_object(
    'store_id', _store_id,
    'store_name', COALESCE(_store_name, 'Unknown Store'),
    'as_of', now(),
    'total_followups', _total_followups,
    'collection_count', _collection_count,
    'delivery_slipping_count', _delivery_slipping_count,
    'paid_undelivered_count', _paid_undelivered_count,
    'quote_cold_count', _quote_cold_count,
    'overdue_action_count', _overdue_count,
    'top_followups', _worklist
  );
END;
$$;

-- 3. Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.ai_get_receivables(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_get_sales_summary(uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_get_cash_position(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_get_payables(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_get_stock_status(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_get_deliveries(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_get_followups(uuid) TO authenticated, service_role;
