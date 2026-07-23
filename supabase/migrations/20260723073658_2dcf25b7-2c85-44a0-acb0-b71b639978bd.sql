
-- 1) Fix create_sales_order_secure to persist salesperson_name
CREATE OR REPLACE FUNCTION public.create_sales_order_secure(
  _order_number text,
  _store_id uuid,
  _supplier_id uuid DEFAULT NULL,
  _date text DEFAULT NULL,
  _customer_name text DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _customer_address text DEFAULT NULL,
  _delivery_date text DEFAULT NULL,
  _delivery_status text DEFAULT 'Pending',
  _advance_paid numeric DEFAULT 0,
  _description text DEFAULT NULL,
  _total_amount numeric DEFAULT 0,
  _items jsonb DEFAULT '[]'::jsonb,
  _customizations jsonb DEFAULT '[]'::jsonb,
  _customer_id uuid DEFAULT NULL,
  _document_type text DEFAULT 'order',
  _salesperson_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_order_id uuid;
  item_record jsonb;
  customization_record jsonb;
  _status text;
BEGIN
  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied: no store access';
  END IF;

  IF _document_type = 'quote' THEN
    _status := 'draft';
  ELSE
    _status := 'pending';
  END IF;

  INSERT INTO public.sales_orders (
    order_number, store_id, supplier_id, date,
    customer_name, customer_phone, customer_address,
    delivery_date, delivery_status, advance_paid,
    description, total_amount, customer_id,
    document_type, status, stock_deducted, bom_processed,
    salesperson_name
  ) VALUES (
    _order_number,
    _store_id,
    _supplier_id,
    CAST(_date AS DATE),
    _customer_name,
    _customer_phone,
    _customer_address,
    CASE WHEN _delivery_date IS NOT NULL THEN CAST(_delivery_date AS DATE) ELSE NULL END,
    _delivery_status,
    CASE WHEN _document_type = 'quote' THEN 0 ELSE _advance_paid END,
    _description,
    _total_amount,
    _customer_id,
    _document_type,
    _status,
    false,
    false,
    NULLIF(TRIM(_salesperson_name), '')
  ) RETURNING id INTO new_order_id;

  FOR customization_record IN SELECT * FROM jsonb_array_elements(_customizations)
  LOOP
    INSERT INTO public.sales_customizations (
      sale_id, bom_component_id, selected_material_id,
      selected_option_name, quantity_used
    ) VALUES (
      new_order_id,
      (customization_record->>'bom_component_id')::uuid,
      (customization_record->>'selected_material_id')::uuid,
      customization_record->>'selected_option_name',
      (customization_record->>'quantity_used')::numeric
    );
  END LOOP;

  FOR item_record IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO public.sales_order_items (
      order_id, item_id, item_name, variant_id,
      supplier_id, quantity, unit_price, total_price
    ) VALUES (
      new_order_id,
      (item_record->>'item_id')::uuid,
      item_record->>'item_name',
      (item_record->>'variant_id')::uuid,
      (item_record->>'supplier_id')::uuid,
      (item_record->>'quantity')::integer,
      (item_record->>'unit_price')::numeric,
      (item_record->>'total_price')::numeric
    );
  END LOOP;

  IF _document_type = 'order' AND _advance_paid > 0 THEN
    INSERT INTO public.payments (
      sale_id, store_id, amount, type, date,
      description, reference_type
    ) VALUES (
      new_order_id,
      _store_id,
      _advance_paid,
      'Receipt',
      CAST(_date AS DATE),
      'Advance payment for order ' || _order_number,
      'sales_order'
    );
  END IF;

  RETURN new_order_id;
END;
$function$;

-- 2) Sales Intelligence aggregation RPC
DROP FUNCTION IF EXISTS public.get_sales_intelligence_summary(uuid, timestamptz, timestamptz);

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
  -- Access guard: if a specific store is requested, enforce access.
  IF _store_id IS NOT NULL AND NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied: no store access';
  END IF;

  WITH accessible_stores AS (
    SELECT s.id FROM public.stores s
    WHERE public.user_has_store_access(s.id)
      AND (_store_id IS NULL OR s.id = _store_id)
  ),
  base_orders AS (
    SELECT so.id, so.store_id, so.date, so.created_at, so.total_amount,
           so.salesperson_name, so.customer_id, so.customer_name
    FROM public.sales_orders so
    JOIN accessible_stores a ON a.id = so.store_id
    WHERE COALESCE(so.document_type, 'order') = 'order'
      AND so.delivery_status <> 'Cancelled'
      AND so.salesperson_name IS NOT NULL
      AND TRIM(so.salesperson_name) <> ''
      AND (_start_date IS NULL OR so.created_at >= _start_date)
      AND (_end_date IS NULL OR so.created_at <= _end_date)
  ),
  order_costs AS (
    SELECT bo.id AS order_id,
           bo.store_id,
           bo.created_at,
           bo.total_amount,
           bo.salesperson_name,
           bo.customer_id,
           COALESCE(SUM(soi.total_price), 0) AS revenue,
           COALESCE(SUM(soi.quantity), 0) AS units,
           COALESCE(SUM(
             (soi.unit_price - COALESCE(i.cost_price, 0)) * soi.quantity
           ), 0) AS gross_profit
    FROM base_orders bo
    LEFT JOIN public.sales_order_items soi ON soi.order_id = bo.id
    LEFT JOIN public.items i ON i.id = soi.item_id
    GROUP BY bo.id, bo.store_id, bo.created_at, bo.total_amount, bo.salesperson_name, bo.customer_id
  ),
  split_orders AS (
    SELECT
      oc.order_id,
      oc.store_id,
      oc.created_at,
      oc.customer_id,
      UPPER(TRIM(name_part.name)) AS sp_name,
      total_names.n AS num_salespeople,
      oc.revenue / total_names.n AS split_revenue,
      oc.gross_profit / total_names.n AS split_profit,
      oc.units::numeric / total_names.n AS split_units,
      1.0 / total_names.n AS split_order_count
    FROM order_costs oc
    CROSS JOIN LATERAL (
      SELECT COUNT(*)::numeric AS n
      FROM regexp_split_to_table(oc.salesperson_name, '\s*,\s*') AS s
      WHERE TRIM(s) <> ''
    ) total_names
    CROSS JOIN LATERAL regexp_split_to_table(oc.salesperson_name, '\s*,\s*') AS name_part(name)
    WHERE TRIM(name_part.name) <> ''
  ),
  per_person AS (
    SELECT
      sp_name AS name,
      SUM(split_revenue) AS revenue,
      SUM(split_profit) AS profit,
      SUM(split_units) AS units,
      SUM(split_order_count) AS orders_closed,
      COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL) AS unique_customers,
      COUNT(DISTINCT order_id) AS orders_touched
    FROM split_orders
    GROUP BY sp_name
  ),
  team_totals AS (
    SELECT
      COALESCE(SUM(revenue), 0) AS total_revenue,
      COALESCE(SUM(profit), 0) AS total_profit,
      COALESCE(SUM(orders_closed), 0) AS total_orders,
      COALESCE(SUM(units), 0) AS total_units
    FROM per_person
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'totalTeamRevenue', tt.total_revenue,
      'totalGrossProfit', tt.total_profit,
      'totalOrdersClosed', ROUND(tt.total_orders),
      'totalUnits', ROUND(tt.total_units),
      'avgOrderValue', CASE WHEN tt.total_orders > 0 THEN ROUND(tt.total_revenue / tt.total_orders) ELSE 0 END,
      'profitMarginPct', CASE WHEN tt.total_revenue > 0 THEN ROUND((tt.total_profit / tt.total_revenue) * 100, 1) ELSE 0 END
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
          'profitMarginPct', CASE WHEN pp.revenue > 0 THEN ROUND((pp.profit / pp.revenue) * 100, 1) ELSE 0 END
        ) ORDER BY pp.revenue DESC
      )
      FROM per_person pp
    ), '[]'::jsonb)
  )
  INTO result
  FROM team_totals tt;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sales_intelligence_summary(uuid, timestamptz, timestamptz) TO authenticated;
