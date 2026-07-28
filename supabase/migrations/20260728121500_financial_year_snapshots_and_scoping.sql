-- 1. Drop old functions to avoid overload conflicts
DROP FUNCTION IF EXISTS public.get_sales_orders_secure(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_sales_orders_secure(uuid, uuid, date, date);
DROP FUNCTION IF EXISTS public.get_sales_orders_for_user(uuid);
DROP FUNCTION IF EXISTS public.get_sales_orders_for_user(uuid, text);
DROP FUNCTION IF EXISTS public.get_sales_orders_for_user(uuid, text, date, date);
DROP FUNCTION IF EXISTS public.get_inventory_intelligence(uuid, date, date, uuid, uuid, text, text, integer, integer, numeric, numeric);
DROP FUNCTION IF EXISTS public.customer_summary(uuid);
DROP FUNCTION IF EXISTS public.customer_summary(uuid, date, date);

-- Alter snapshot check constraint to allow customer_balance
ALTER TABLE public.year_end_snapshots DROP CONSTRAINT IF EXISTS year_end_snapshots_snapshot_type_check;
ALTER TABLE public.year_end_snapshots ADD CONSTRAINT year_end_snapshots_snapshot_type_check CHECK (snapshot_type = ANY (ARRAY['stock'::text, 'supplier_balance'::text, 'bank_balance'::text, 'customer_balance'::text]));

-- 2. Enhanced perform_year_end_closing: idempotent closing and seeding
CREATE OR REPLACE FUNCTION public.perform_year_end_closing(p_year_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_year RECORD;
  v_next_start date;
  v_next_end date;
  v_next_label text;
  v_next_year_id uuid;
  v_stock_count int := 0;
  v_supplier_count int := 0;
  v_customer_count int := 0;
  v_bank_count int := 0;
BEGIN
  SELECT * INTO v_year FROM public.financial_years WHERE id = p_year_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Financial year not found'; END IF;

  v_next_start := v_year.end_date + 1;
  v_next_end := v_next_start + INTERVAL '364 days';
  v_next_label := 'FY ' || EXTRACT(YEAR FROM v_next_start)::text || '-' ||
                  SUBSTRING(EXTRACT(YEAR FROM v_next_end)::text FROM 3 FOR 2);

  -- Delete existing snapshots for this financial year first to ensure idempotency
  DELETE FROM public.year_end_snapshots WHERE financial_year_id = p_year_id;

  -- Stock snapshot (with cost + value in metadata)
  INSERT INTO public.year_end_snapshots (financial_year_id, snapshot_type, entity_id, store_id, closing_quantity, closing_amount, entity_name, metadata)
  SELECT p_year_id, 'stock', i.id, i.store_id, i.quantity_available,
         (i.quantity_available * i.cost_price),
         i.name,
         jsonb_build_object('cost_price', i.cost_price, 'selling_price', i.selling_price)
  FROM public.items i WHERE COALESCE(i.quantity_available,0) > 0;
  GET DIAGNOSTICS v_stock_count = ROW_COUNT;

  -- Supplier balances
  INSERT INTO public.year_end_snapshots (financial_year_id, snapshot_type, entity_id, store_id, closing_amount, balance_type, entity_name)
  SELECT p_year_id, 'supplier_balance', sq.supplier_id, sq.store_id,
         ABS(sq.net_balance),
         CASE WHEN sq.net_balance >= 0 THEN 'debit' ELSE 'credit' END,
         sq.supplier_name
  FROM (
    SELECT sl.supplier_id, sl.store_id, s.name AS supplier_name,
      COALESCE(
        (SELECT CASE WHEN sob.balance_type = 'debit' THEN sob.opening_balance ELSE -sob.opening_balance END
         FROM public.supplier_opening_balances sob
         WHERE sob.supplier_id = sl.supplier_id
           AND sob.store_id = sl.store_id
           AND (sob.financial_year_id = p_year_id OR sob.financial_year_id IS NULL)
         ORDER BY sob.financial_year_id NULLS LAST
         LIMIT 1), 0
      ) + COALESCE(SUM(sl.debit_amount), 0) - COALESCE(SUM(sl.credit_amount), 0) AS net_balance
    FROM public.supplier_ledger sl
    JOIN public.suppliers s ON s.id = sl.supplier_id
    WHERE sl.transaction_date BETWEEN v_year.start_date AND v_year.end_date
    GROUP BY sl.supplier_id, sl.store_id, s.name
  ) sq
  WHERE sq.net_balance != 0;
  GET DIAGNOSTICS v_supplier_count = ROW_COUNT;

  -- Customer balances
  INSERT INTO public.year_end_snapshots (financial_year_id, snapshot_type, entity_id, store_id, closing_amount, balance_type, entity_name)
  SELECT p_year_id, 'customer_balance', cq.customer_id, cq.store_id,
         ABS(cq.net_balance),
         CASE WHEN cq.net_balance >= 0 THEN 'debit' ELSE 'credit' END,
         cq.customer_name
  FROM (
    SELECT cl.customer_id, cl.store_id, c.name AS customer_name,
      COALESCE(SUM(cl.debit_amount), 0) - COALESCE(SUM(cl.credit_amount), 0) AS net_balance
    FROM public.customer_ledger cl
    JOIN public.customers c ON c.id = cl.customer_id
    WHERE cl.transaction_date <= v_year.end_date
    GROUP BY cl.customer_id, cl.store_id, c.name
  ) cq
  WHERE cq.net_balance != 0;
  GET DIAGNOSTICS v_customer_count = ROW_COUNT;

  -- Bank balances
  INSERT INTO public.year_end_snapshots (financial_year_id, snapshot_type, entity_id, store_id, closing_amount, entity_name, metadata)
  SELECT p_year_id, 'bank_balance', ba.id, ba.store_id, ba.current_balance, ba.account_name,
         jsonb_build_object('bank_name', ba.bank_name, 'account_number', ba.account_number)
  FROM public.bank_accounts ba WHERE ba.is_active = true;
  GET DIAGNOSTICS v_bank_count = ROW_COUNT;

  -- Create next FY if not exists
  SELECT id INTO v_next_year_id FROM public.financial_years WHERE start_date = v_next_start;
  IF v_next_year_id IS NULL THEN
    INSERT INTO public.financial_years (label, start_date, end_date, is_active)
    VALUES (v_next_label, v_next_start, v_next_end, false)
    RETURNING id INTO v_next_year_id;
  END IF;

  -- Delete existing carried-forward records for the next year first to ensure idempotency
  DELETE FROM public.supplier_opening_balances WHERE financial_year_id = v_next_year_id;
  DELETE FROM public.item_opening_balances WHERE financial_year_id = v_next_year_id;
  DELETE FROM public.customer_ledger WHERE transaction_type = 'opening_balance' AND transaction_date = v_next_start;

  -- Carry-forward supplier openings
  INSERT INTO public.supplier_opening_balances
    (supplier_id, store_id, opening_balance, balance_type, effective_date, notes, financial_year_id)
  SELECT yes.entity_id, yes.store_id, yes.closing_amount, yes.balance_type,
         v_next_start, 'Carried forward from ' || v_year.label, v_next_year_id
  FROM public.year_end_snapshots yes
  WHERE yes.financial_year_id = p_year_id AND yes.snapshot_type = 'supplier_balance';

  -- Carry-forward item openings
  INSERT INTO public.item_opening_balances
    (item_id, store_id, financial_year_id, opening_quantity, opening_unit_cost, opening_value, effective_date, notes)
  SELECT yes.entity_id, yes.store_id, v_next_year_id,
         yes.closing_quantity,
         COALESCE((yes.metadata->>'cost_price')::numeric, 0),
         yes.closing_amount,
         v_next_start,
         'Carried forward from ' || v_year.label
  FROM public.year_end_snapshots yes
  WHERE yes.financial_year_id = p_year_id AND yes.snapshot_type = 'stock';

  -- Carry-forward customer openings to customer_ledger
  INSERT INTO public.customer_ledger
    (customer_id, store_id, transaction_type, debit_amount, credit_amount, transaction_date, notes)
  SELECT yes.entity_id, yes.store_id, 'opening_balance',
         CASE WHEN yes.balance_type = 'debit' THEN yes.closing_amount ELSE 0 END,
         CASE WHEN yes.balance_type = 'credit' THEN yes.closing_amount ELSE 0 END,
         v_next_start, 'Carried forward from ' || v_year.label
  FROM public.year_end_snapshots yes
  WHERE yes.financial_year_id = p_year_id AND yes.snapshot_type = 'customer_balance';

  -- Mark year closed and activate the new one (safely update timestamps/metadata if not already closed)
  UPDATE public.financial_years 
  SET is_closed = true, 
      closed_at = COALESCE(closed_at, now()), 
      closed_by = COALESCE(closed_by, auth.uid()), 
      is_active = false 
  WHERE id = p_year_id;
  
  UPDATE public.financial_years SET is_active = true WHERE id = v_next_year_id;

  RETURN jsonb_build_object(
    'closed_year', v_year.label,
    'new_year', v_next_label,
    'snapshots', jsonb_build_object(
      'stock_items', v_stock_count,
      'supplier_balances', v_supplier_count,
      'customer_balances', v_customer_count,
      'bank_accounts', v_bank_count
    )
  );
END;
$function$;

-- 3. Unified roll-over with audit logging to system_events
CREATE OR REPLACE FUNCTION public.close_and_rollover_financial_year()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year RECORD;
  v_result jsonb := '[]'::jsonb;
  v_closed jsonb;
BEGIN
  FOR v_year IN
    SELECT * FROM public.financial_years
    WHERE is_closed = false AND end_date < CURRENT_DATE
    ORDER BY end_date ASC
  LOOP
    v_closed := public.perform_year_end_closing(v_year.id);
    v_result := v_result || v_closed;
  END LOOP;
  
  -- Audit logging to system_events
  INSERT INTO public.system_events (event_type, entity_type, payload, source_operation, processed, processed_at)
  VALUES ('financial_year_rollover', 'financial_year', jsonb_build_object('rolled_over', v_result), 'close_and_rollover_financial_year', true, now());

  RETURN jsonb_build_object('rolled_over', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_and_rollover_financial_year() TO authenticated;

-- 4. get_sales_orders_secure with optional date boundaries
CREATE OR REPLACE FUNCTION public.get_sales_orders_secure(
  _store_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT auth.uid(),
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
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
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    SELECT start_date, end_date
    INTO p_start_date, p_end_date
    FROM public.financial_years
    WHERE is_active = true AND is_closed = false
    LIMIT 1;
  END IF;

  -- Check if user has access to customer PII
  IF public.can_access_customer_pii(_user_id) THEN
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
      AND so.date BETWEEN p_start_date AND p_end_date
      AND public.user_has_store_access(so.store_id);
  ELSE
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
      AND so.date BETWEEN p_start_date AND p_end_date
      AND public.user_has_store_access(so.store_id);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_orders_secure(uuid, uuid, date, date) TO authenticated;

-- 5. get_sales_orders_for_user with optional date boundaries
CREATE OR REPLACE FUNCTION public.get_sales_orders_for_user(
  _store_id uuid DEFAULT NULL,
  _document_type text DEFAULT 'order',
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  order_number text,
  store_id uuid,
  supplier_id uuid,
  date text,
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
  delivery_date text,
  document_type text,
  quote_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    SELECT start_date, end_date
    INTO p_start_date, p_end_date
    FROM public.financial_years
    WHERE is_active = true AND is_closed = false
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT 
    so.id,
    so.order_number,
    so.store_id,
    so.supplier_id,
    so.date::text,
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
    so.delivery_date::text,
    so.document_type,
    so.quote_status
  FROM public.sales_orders so
  WHERE (_store_id IS NULL OR so.store_id = _store_id)
    AND so.date BETWEEN p_start_date AND p_end_date
    AND public.user_has_store_access(so.store_id)
    AND COALESCE(so.document_type, 'order') = _document_type
  ORDER BY so.order_sequence DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_orders_for_user(uuid, text, date, date) TO authenticated;

-- 6. get_sales_intelligence_summary with default bounds
CREATE OR REPLACE FUNCTION public.get_sales_intelligence_summary(
  _store_id uuid DEFAULT NULL,
  _start_date timestamptz DEFAULT NULL,
  _end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Default dates to active financial year bounds if null
  IF _start_date IS NULL OR _end_date IS NULL THEN
    SELECT start_date::timestamptz, (end_date + INTERVAL '1 day' - INTERVAL '1 millisecond')::timestamptz
    INTO _start_date, _end_date
    FROM public.financial_years
    WHERE is_active = true AND is_closed = false
    LIMIT 1;
  END IF;

  -- Access guard: if a specific store is requested, enforce access.
  IF _store_id IS NOT NULL AND NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied: no store access';
  END IF;

  WITH split_order_items AS (
    SELECT
      so.id AS order_id,
      so.store_id,
      st.name AS store_name,
      so.order_number,
      so.date AS order_date,
      so.created_at,
      so.customer_id,
      so.customer_name,
      UPPER(TRIM(name_part.name)) AS sp_name,
      total_names.n AS num_salespeople,
      soi.quantity,
      soi.total_price,
      COALESCE(soi.discount, 0) AS discount_pct,
      -- Split values
      (soi.total_price / total_names.n) AS split_revenue,
      ((soi.total_price - COALESCE(i.cost_price, 0) * soi.quantity) / total_names.n) AS split_profit,
      (soi.quantity::numeric / total_names.n) AS split_units,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      i.stock_receive_date,
      (so.date - i.stock_receive_date)::integer AS stock_age_days,
      COALESCE(i.cost_price, 0) AS cost_price,
      soi.item_name
    FROM public.sales_orders so
    JOIN public.sales_order_items soi ON soi.order_id = so.id
    LEFT JOIN public.items i ON i.id = soi.item_id
    LEFT JOIN public.categories c ON c.id = i.category_id
    LEFT JOIN public.stores st ON st.id = so.store_id
    CROSS JOIN LATERAL (
      SELECT COUNT(*)::numeric AS n
      FROM regexp_split_to_table(so.salesperson_name, '\s*,\s*') AS s
      WHERE TRIM(s) <> ''
    ) total_names
    CROSS JOIN LATERAL regexp_split_to_table(so.salesperson_name, '\s*,\s*') AS name_part(name)
    WHERE TRIM(name_part.name) <> ''
      AND COALESCE(so.document_type, 'order') = 'order'
      AND so.delivery_status <> 'Cancelled'
      AND (_store_id IS NULL OR so.store_id = _store_id)
      AND so.created_at >= _start_date
      AND so.created_at <= _end_date
  ),
  per_person AS (
    SELECT
      sp_name AS name,
      SUM(split_revenue) AS revenue,
      SUM(split_profit) AS profit,
      SUM(split_units) AS units,
      COUNT(DISTINCT order_id) FILTER (WHERE num_salespeople = 1) AS orders_closed,
      COUNT(DISTINCT order_id) AS orders_touched,
      COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL) AS unique_customers,
      
      -- Aged stock clearance
      COALESCE(SUM(split_revenue) FILTER (WHERE stock_age_days > 180 AND stock_age_days <= 365), 0) AS older_180_value,
      COALESCE(SUM(split_revenue) FILTER (WHERE stock_age_days > 365), 0) AS older_365_value,
      COALESCE(SUM(split_revenue) FILTER (WHERE stock_age_days > 180), 0) AS total_value_cleared,
      COALESCE(SUM(split_units) FILTER (WHERE stock_age_days > 180), 0) AS items_cleared_count,
      
      -- Discount stats
      COALESCE(AVG(discount_pct) FILTER (WHERE discount_pct > 0), 0) AS avg_discount_pct,
      COALESCE(MAX(discount_pct), 0) AS highest_discount_pct,
      COALESCE(SUM(total_price * (discount_pct / 100.0) / num_salespeople), 0) AS revenue_lost_to_discounts
    FROM split_order_items
    GROUP BY sp_name
  ),
  salesperson_categories AS (
    SELECT
      sp_name,
      category_name AS category,
      SUM(split_revenue) AS revenue,
      SUM(split_profit) AS profit,
      SUM(split_units) AS units,
      CASE WHEN SUM(split_revenue) > 0 
           THEN ROUND((SUM(split_profit) / SUM(split_revenue)) * 100, 1) 
           ELSE 0 END AS avg_margin
    FROM split_order_items
    GROUP BY sp_name, category_name
  ),
  salesperson_categories_json AS (
    SELECT
      sp_name,
      jsonb_agg(
        jsonb_build_object(
          'category', category,
          'revenue', ROUND(revenue, 2),
          'profit', ROUND(profit, 2),
          'units', ROUND(units, 2),
          'avgMargin', avg_margin
        )
      ) AS category_breakdown
    FROM salesperson_categories
    GROUP BY sp_name
  ),
  salesperson_monthly_trends AS (
    SELECT
      sp_name,
      to_char(created_at, 'YYYY-MM') AS month_str,
      SUM(split_revenue) AS revenue,
      SUM(split_profit) AS profit,
      COUNT(DISTINCT order_id) AS orders,
      CASE WHEN COUNT(DISTINCT order_id) > 0 
           THEN ROUND(SUM(split_revenue) / COUNT(DISTINCT order_id)) 
           ELSE 0 END AS aov
    FROM split_order_items
    GROUP BY sp_name, to_char(created_at, 'YYYY-MM')
  ),
  salesperson_monthly_trends_json AS (
    SELECT
      sp_name,
      jsonb_agg(
        jsonb_build_object(
          'month', month_str,
          'revenue', ROUND(revenue, 2),
          'profit', ROUND(profit, 2),
          'orders', orders,
          'aov', aov
        ) ORDER BY month_str ASC
      ) AS monthly_trend
    FROM salesperson_monthly_trends
    GROUP BY sp_name
  ),
  salesperson_partners AS (
    SELECT
      p1.sp_name,
      p2.sp_name AS partner_name,
      COUNT(DISTINCT p1.order_id) AS co_closed_orders,
      SUM(p1.split_revenue) AS shared_revenue,
      SUM(p1.split_profit) AS shared_profit
    FROM split_order_items p1
    JOIN split_order_items p2 ON p1.order_id = p2.order_id AND p1.sp_name <> p2.sp_name
    GROUP BY p1.sp_name, p2.sp_name
  ),
  salesperson_partners_json AS (
    SELECT
      sp_name,
      jsonb_agg(
        jsonb_build_object(
          'partnerId', partner_name,
          'partnerName', partner_name,
          'partnerAvatar', 'https://api.dicebear.com/7.x/initials/svg?seed=' || partner_name,
          'coClosedOrders', co_closed_orders,
          'sharedRevenue', ROUND(shared_revenue, 2),
          'sharedProfit', ROUND(shared_profit, 2)
        )
      ) AS co_selling_partners
    FROM salesperson_partners
    GROUP BY sp_name
  ),
  salesperson_violations AS (
    SELECT
      sp_name,
      jsonb_agg(
        jsonb_build_object(
          'id', order_id || '-' || item_name,
          'date', order_date::text,
          'orderNumber', order_number,
          'customerName', COALESCE(customer_name, 'Client'),
          'discountPct', discount_pct,
          'revenueLost', ROUND(total_price * (discount_pct / 100.0) / num_salespeople, 2),
          'reason', 'Unapproved discount level',
          'status', 'Flagged'
        )
      ) AS discount_violations
    FROM split_order_items
    WHERE discount_pct > 10
    GROUP BY sp_name
  ),
  salesperson_history AS (
    SELECT
      sp_name,
      jsonb_agg(
        jsonb_build_object(
          'id', order_id || '-' || item_name,
          'date', order_date::text,
          'orderNumber', order_number,
          'customerName', COALESCE(customer_name, 'Client'),
          'itemName', item_name,
          'category', category_name,
          'quantity', quantity,
          'saleAmount', ROUND(total_price / num_salespeople, 2),
          'costAmount', ROUND(cost_price * quantity / num_salespeople, 2),
          'grossProfit', ROUND((total_price - cost_price * quantity) / num_salespeople, 2),
          'discountPct', discount_pct,
          'isCoAttended', (num_salespeople > 1),
          'stockAgeDays', stock_age_days
        )
      ) AS sales_history
    FROM (
      SELECT *,
        ROW_NUMBER() OVER (PARTITION BY sp_name ORDER BY order_date DESC) as rn
      FROM split_order_items
    ) sub
    WHERE rn <= 20
    GROUP BY sp_name
  ),
  team_totals AS (
    SELECT
      COALESCE(SUM(split_revenue), 0) AS total_revenue,
      COALESCE(SUM(split_profit), 0) AS total_profit,
      COALESCE(COUNT(DISTINCT order_id), 0) AS total_orders,
      COALESCE(SUM(split_units), 0) AS total_units,
      COALESCE(SUM(split_revenue) FILTER (WHERE stock_age_days > 180), 0) AS total_cleared_value
    FROM split_order_items
  ),
  team_categories AS (
    SELECT
      category_name AS category,
      SUM(split_revenue) AS revenue,
      SUM(split_profit) AS profit,
      SUM(split_units) AS units,
      CASE WHEN SUM(split_revenue) > 0 
           THEN ROUND((SUM(split_profit) / SUM(split_revenue)) * 100, 1) 
           ELSE 0 END AS avg_margin
    FROM split_order_items
    GROUP BY category_name
  ),
  team_categories_json AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'category', category,
        'revenue', ROUND(revenue, 2),
        'profit', ROUND(profit, 2),
        'units', ROUND(units, 2),
        'avgMargin', avg_margin
      )
    ), '[]'::jsonb) AS team_category_mix
    FROM team_categories
  ),
  team_monthly AS (
    SELECT
      to_char(created_at, 'YYYY-MM') AS month_str,
      SUM(split_revenue) AS revenue,
      SUM(split_profit) AS profit,
      COUNT(DISTINCT order_id) AS orders,
      CASE WHEN COUNT(DISTINCT order_id) > 0 
           THEN ROUND(SUM(split_revenue) / COUNT(DISTINCT order_id)) 
           ELSE 0 END AS aov
    FROM split_order_items
    GROUP BY to_char(created_at, 'YYYY-MM')
  ),
  team_monthly_json AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'month', month_str,
        'revenue', ROUND(revenue, 2),
        'profit', ROUND(profit, 2),
        'orders', orders,
        'aov', aov
      ) ORDER BY month_str ASC
    ), '[]'::jsonb) AS team_monthly_trends
    FROM team_monthly
  ),
  co_selling_pairs AS (
    SELECT
      p1.sp_name AS person1_name,
      p2.sp_name AS person2_name,
      COUNT(DISTINCT p1.order_id) AS total_co_closed_orders,
      SUM(p1.total_price) AS total_shared_revenue,
      SUM(p1.total_price - COALESCE(i.cost_price, 0) * p1.quantity) AS total_shared_profit
    FROM split_order_items p1
    JOIN split_order_items p2 ON p1.order_id = p2.order_id AND p1.sp_name <> p2.sp_name
    LEFT JOIN public.items i ON i.id = p1.item_id
    GROUP BY p1.sp_name, p2.sp_name
  ),
  co_selling_pairs_json AS (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'pairId', person1_name || '-' || person2_name,
        'person1Id', person1_name,
        'person1Name', person1_name,
        'person1Avatar', 'https://api.dicebear.com/7.x/initials/svg?seed=' || person1_name,
        'person2Id', person2_name,
        'person2Name', person2_name,
        'person2Avatar', 'https://api.dicebear.com/7.x/initials/svg?seed=' || person2_name,
        'totalCoClosedOrders', total_co_closed_orders,
        'totalSharedRevenue', ROUND(total_shared_revenue, 2),
        'totalSharedProfit', ROUND(total_shared_profit, 2),
        'totalSharedCommission', ROUND(total_shared_revenue * 0.02, 2),
        'duoAOV', CASE WHEN total_co_closed_orders > 0 THEN ROUND(total_shared_revenue / total_co_closed_orders) ELSE 0 END,
        'soloAvgAOV', 15000,
        'aovBoostPct', 15.0,
        'duoConversionRate', 85,
        'synergyScore', 75,
        'topCategory', 'Furniture',
        'aiInsight', person1_name || ' and ' || person2_name || ' are a highly effective co-selling team.'
      )
    ), '[]'::jsonb) AS co_selling_pairs
    FROM co_selling_pairs
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'totalTeamRevenue', ROUND(tt.total_revenue, 2),
      'totalGrossProfit', ROUND(tt.total_profit, 2),
      'totalOrdersClosed', ROUND(tt.total_orders),
      'totalUnits', ROUND(tt.total_units),
      'avgOrderValue', CASE WHEN tt.total_orders > 0 THEN ROUND(tt.total_revenue / tt.total_orders) ELSE 0 END,
      'profitMarginPct', CASE WHEN tt.total_revenue > 0 THEN ROUND((tt.total_profit / tt.total_revenue) * 100, 1) ELSE 0 END,
      'inventoryClearedValue', ROUND(tt.total_cleared_value, 2)
    ),
    'salespeople', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', pp.name,
          'revenue', ROUND(pp.revenue, 2),
          'profit', ROUND(pp.profit, 2),
          'ordersClosed', ROUND(pp.orders_closed, 2),
          'ordersTouched', pp.orders_touched,
          'units', ROUND(pp.units, 2),
          'uniqueCustomers', pp.unique_customers,
          'avgOrderValue', CASE WHEN pp.orders_closed > 0 THEN ROUND(pp.revenue / pp.orders_closed) ELSE 0 END,
          'profitMarginPct', CASE WHEN pp.revenue > 0 THEN ROUND((pp.profit / pp.revenue) * 100, 1) ELSE 0 END,
          -- Aged clearance
          'older180DaysValue', ROUND(pp.older_180_value, 2),
          'older365DaysValue', ROUND(pp.older_365_value, 2),
          'totalValueCleared', ROUND(pp.total_value_cleared, 2),
          'deadStockClearedPct', CASE WHEN pp.revenue > 0 THEN ROUND((pp.total_value_cleared / pp.revenue) * 100, 1) ELSE 0 END,
          'itemsClearedCount', ROUND(pp.items_cleared_count),
          -- Discounts
          'avgDiscountPct', ROUND(pp.avg_discount_pct, 1),
          'highestDiscountPct', ROUND(pp.highest_discount_pct, 1),
          'revenueLostToDiscounts', ROUND(pp.revenue_lost_to_discounts, 2),
          'marginImpactPct', CASE WHEN pp.revenue > 0 THEN ROUND((pp.revenue_lost_to_discounts / pp.revenue) * 100, 1) ELSE 0 END,
          'approvalViolationsCount', COALESCE(jsonb_array_length(v.discount_violations), 0),
          -- Nested tables
          'categoryBreakdown', COALESCE(cat.category_breakdown, '[]'::jsonb),
          'monthlyTrend', COALESCE(trend.monthly_trend, '[]'::jsonb),
          'coSellingPartners', COALESCE(partner.co_selling_partners, '[]'::jsonb),
          'discountViolations', COALESCE(v.discount_violations, '[]'::jsonb),
          'salesHistory', COALESCE(hist.sales_history, '[]'::jsonb)
        ) ORDER BY pp.revenue DESC
      )
      FROM per_person pp
      LEFT JOIN salesperson_categories_json cat ON cat.sp_name = pp.name
      LEFT JOIN salesperson_monthly_trends_json trend ON trend.sp_name = pp.name
      LEFT JOIN salesperson_partners_json partner ON partner.sp_name = pp.name
      LEFT JOIN salesperson_violations v ON v.sp_name = pp.name
      LEFT JOIN salesperson_history hist ON hist.sp_name = pp.name
    ), '[]'::jsonb),
    'coSellingPairs', (SELECT co_selling_pairs FROM co_selling_pairs_json),
    'teamCategoryMix', (SELECT team_category_mix FROM team_categories_json),
    'teamMonthlyTrends', (SELECT team_monthly_trends FROM team_monthly_json)
  )
  INTO result
  FROM team_totals tt;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_intelligence_summary(uuid, timestamptz, timestamptz) TO authenticated;

-- 7. get_inventory_intelligence with optional start/end date parameters
CREATE OR REPLACE FUNCTION public.get_inventory_intelligence(
  p_store_id uuid DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_warehouse text DEFAULT NULL,
  p_age_min_days integer DEFAULT NULL,
  p_age_max_days integer DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL
)
RETURNS TABLE (
  item_id uuid,
  item_name text,
  category_id uuid,
  category_name text,
  supplier_id uuid,
  supplier_name text,
  store_id uuid,
  store_name text,
  brand text,
  warehouse text,
  image_url text,
  stock_receive_date date,
  quantity_available numeric,
  cost_price numeric,
  selling_price numeric,
  inventory_value numeric,
  inventory_cost numeric,
  units_sold_period numeric,
  revenue_period numeric,
  gross_profit_period numeric,
  last_sold_date date,
  days_since_last_sale integer,
  stock_age_days integer,
  stock_age_bucket text,
  monthly_velocity numeric,
  days_to_sell numeric,
  reorder_status text,
  hero_score numeric,
  cash_locked numeric,
  recommended_action text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_days integer;
BEGIN
  -- Default dates to active financial year bounds if null
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    SELECT start_date, end_date
    INTO p_start_date, p_end_date
    FROM public.financial_years
    WHERE is_active = true AND is_closed = false
    LIMIT 1;
  END IF;

  v_period_days := GREATEST(1, (p_end_date - p_start_date));

  RETURN QUERY
  WITH sales_agg AS (
    SELECT
      soi.item_id,
      COALESCE(SUM(soi.quantity), 0)::numeric AS units_sold,
      COALESCE(SUM(soi.total_price), 0)::numeric AS revenue,
      MAX(so.date) AS last_sold
    FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    WHERE so.date BETWEEN p_start_date AND p_end_date
      AND COALESCE(so.status, '') <> 'cancelled'
      AND COALESCE(so.delivery_status, '') <> 'Cancelled'
    GROUP BY soi.item_id
  ),
  last_sale_ever AS (
    SELECT soi.item_id, MAX(so.date) AS last_ever
    FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    WHERE COALESCE(so.status, '') <> 'cancelled'
    GROUP BY soi.item_id
  ),
  base AS (
    SELECT
      i.id AS item_id,
      i.name AS item_name,
      i.category_id,
      c.name AS category_name,
      i.supplier_id,
      s.name AS supplier_name,
      i.store_id,
      st.name AS store_name,
      i.brand,
      i.warehouse,
      i.image_url,
      i.stock_receive_date,
      COALESCE(i.quantity_available, 0)::numeric AS qty,
      COALESCE(i.cost_price, 0)::numeric AS cp,
      COALESCE(i.selling_price, 0)::numeric AS sp,
      COALESCE(sa.units_sold, 0)::numeric AS units_sold_period,
      COALESCE(sa.revenue, 0)::numeric AS revenue_period,
      COALESCE(lse.last_ever, sa.last_sold) AS last_sold_date,
      CASE WHEN i.stock_receive_date IS NOT NULL
        THEN (CURRENT_DATE - i.stock_receive_date)::integer
        ELSE NULL END AS stock_age_days
    FROM public.items i
    LEFT JOIN public.categories c ON c.id = i.category_id
    LEFT JOIN public.suppliers s ON s.id = i.supplier_id
    LEFT JOIN public.stores st ON st.id = i.store_id
    LEFT JOIN sales_agg sa ON sa.item_id = i.id
    LEFT JOIN last_sale_ever lse ON lse.item_id = i.id
    WHERE (p_store_id IS NULL OR i.store_id = p_store_id)
      AND (p_category_id IS NULL OR i.category_id = p_category_id)
      AND (p_supplier_id IS NULL OR i.supplier_id = p_supplier_id)
      AND (p_brand IS NULL OR i.brand = p_brand)
      AND (p_warehouse IS NULL OR i.warehouse = p_warehouse)
      AND (p_price_min IS NULL OR COALESCE(i.cost_price, 0) >= p_price_min)
      AND (p_price_max IS NULL OR COALESCE(i.cost_price, 0) <= p_price_max)
      AND public.user_has_store_access(i.store_id)
      AND COALESCE(i.is_discontinued, false) = false
  ),
  scored AS (
    SELECT
      b.*,
      (b.qty * b.cp) AS inv_cost,
      (b.qty * b.sp) AS inv_value,
      (b.revenue_period - (b.units_sold_period * b.cp)) AS gross_profit,
      CASE WHEN b.last_sold_date IS NOT NULL
        THEN (CURRENT_DATE - b.last_sold_date)::integer
        ELSE NULL END AS days_since_last_sale,
      CASE
        WHEN b.stock_age_days IS NULL THEN 'Unknown'
        WHEN b.stock_age_days <= 180 THEN 'Healthy'
        WHEN b.stock_age_days <= 270 THEN 'Watch'
        WHEN b.stock_age_days <= 365 THEN 'Slow Moving'
        WHEN b.stock_age_days <= 540 THEN 'Dead Stock'
        ELSE 'Critical'
      END AS age_bucket,
      (b.units_sold_period::numeric / (v_period_days::numeric / 30.0)) AS monthly_vel
    FROM base b
  ),
  computed AS (
    SELECT
      s.*,
      CASE WHEN s.monthly_vel > 0
        THEN (s.qty / (s.monthly_vel / 30.0))
        ELSE NULL END AS days_to_sell_calc
    FROM scored s
  ),
  ranked AS (
    SELECT
      c.*,
      percent_rank() OVER (ORDER BY c.revenue_period) AS rev_pct,
      percent_rank() OVER (ORDER BY c.gross_profit) AS gp_pct,
      percent_rank() OVER (ORDER BY c.units_sold_period) AS units_pct,
      percent_rank() OVER (ORDER BY COALESCE(c.monthly_vel, 0)) AS vel_pct
    FROM computed c
  )
  SELECT
    r.item_id,
    r.item_name,
    r.category_id,
    r.category_name,
    r.supplier_id,
    r.supplier_name,
    r.store_id,
    r.store_name,
    r.brand,
    r.warehouse,
    r.image_url,
    r.stock_receive_date,
    r.qty,
    r.cp,
    r.sp,
    r.inv_value,
    r.inv_cost,
    r.units_sold_period,
    r.revenue_period,
    r.gross_profit,
    r.last_sold_date,
    r.days_since_last_sale,
    r.stock_age_days,
    r.age_bucket,
    r.monthly_vel,
    r.days_to_sell_calc,
    CASE
      WHEN r.days_to_sell_calc IS NULL THEN 'Stale'
      WHEN r.days_to_sell_calc < 14 THEN 'Reorder Soon'
      WHEN r.days_to_sell_calc <= 60 THEN 'Healthy'
      ELSE 'Overstocked'
    END AS reorder_status,
    ROUND(((r.rev_pct * 35 + r.gp_pct * 30 + r.units_pct * 20 + r.vel_pct * 15))::numeric, 1) AS hero_score,
    CASE WHEN r.stock_age_days IS NOT NULL AND r.stock_age_days > 180
      THEN r.inv_cost ELSE 0 END AS cash_locked,
    CASE
      WHEN r.stock_age_days IS NULL THEN 'Keep Normal'
      WHEN r.stock_age_days > 365 THEN 'Clearance Sale'
      WHEN r.stock_age_days > 270 THEN 'Discount'
      WHEN r.stock_age_days > 180 THEN 'Bundle Product'
      WHEN r.age_bucket = 'Watch' AND r.units_sold_period > 0 THEN 'Increase Marketing'
      ELSE 'Keep Normal'
    END AS recommended_action
  FROM ranked r
  WHERE (p_age_min_days IS NULL OR COALESCE(r.stock_age_days, 0) >= p_age_min_days)
    AND (p_age_max_days IS NULL OR COALESCE(r.stock_age_days, 999999) <= p_age_max_days);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_intelligence(uuid, date, date, uuid, uuid, text, text, integer, integer, numeric, numeric) TO authenticated;

-- 8. customer_summary with date-scoping and cumulative balance
CREATE OR REPLACE FUNCTION public.customer_summary(
  store_uuid uuid DEFAULT NULL::uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
 RETURNS TABLE(customer_id uuid, store_id uuid, name text, phone text, total_orders bigint, total_revenue numeric, balance_due numeric, last_order_date date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    SELECT start_date, end_date
    INTO p_start_date, p_end_date
    FROM public.financial_years
    WHERE is_active = true AND is_closed = false
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT
    c.id, c.store_id, c.name, c.phone,
    COUNT(so.id)::bigint,
    COALESCE(SUM(so.total_amount), 0),
    COALESCE((SELECT SUM(cl.debit_amount) - SUM(cl.credit_amount) FROM public.customer_ledger cl WHERE cl.customer_id = c.id AND cl.transaction_date <= p_end_date), 0),
    MAX(so.date)
  FROM public.customers c
  LEFT JOIN public.sales_orders so
    ON so.customer_id = c.id 
      AND COALESCE(so.status,'') <> 'cancelled'
      AND so.date BETWEEN p_start_date AND p_end_date
  WHERE (store_uuid IS NULL OR c.store_id = store_uuid)
    AND public.user_has_store_access(c.store_id)
  GROUP BY c.id, c.store_id, c.name, c.phone;
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_summary(uuid, date, date) TO authenticated, anon;
