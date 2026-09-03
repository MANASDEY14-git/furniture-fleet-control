-- =========================================================
-- Factual Reorder & Dead Stock Intelligence
-- Replaces old velocity approximations with evidence-backed facts
-- =========================================================

-- Drop existing overloaded signatures per RPC maintenance rule
DROP FUNCTION IF EXISTS public.get_reorder_intelligence(uuid, integer);
DROP FUNCTION IF EXISTS public.get_reorder_intelligence(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_reorder_intelligence(
  _store_id uuid,
  _window_days integer DEFAULT 365,
  _horizon_days integer DEFAULT NULL
)
RETURNS TABLE (
  item_id uuid,
  item_name text,
  brand text,
  warehouse text,
  category_id uuid,
  category_name text,
  supplier_id uuid,
  supplier_name text,
  -- Demand facts
  units_sold_30d numeric,
  units_sold_90d numeric,
  units_sold_365d numeric,
  orders_count_30d integer,
  orders_count_90d integer,
  orders_count_365d integer,
  orders_count_ever integer,
  first_sale_date date,
  last_sale_date date,
  days_since_last_sale integer,
  selling_months_count integer,
  avg_units_per_order numeric,
  -- Demand class & estimation
  demand_class text,
  confidence text,
  demand_rate_basis text,
  estimated_monthly_demand numeric,
  category_monthly_rate numeric,
  -- Replenishment facts
  current_stock numeric,
  open_demand numeric,
  net_stock numeric,
  cost_price numeric,
  selling_price numeric,
  stock_value numeric,
  supplier_lead_days integer,
  last_purchase_date date,
  days_held integer,
  -- Decision & suggested action
  decision text,
  lead_time_demand numeric,
  cover_days numeric,
  suggested_qty numeric,
  suggested_order_cost numeric,
  evidence_sentence text,
  -- Compatibility aliases
  quantity_available numeric,
  units_sold numeric,
  days_since_sale integer,
  bucket text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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
  WITH store_items AS (
    SELECT
      i.id AS item_id,
      i.name AS item_name,
      i.brand,
      i.warehouse,
      i.supplier_id,
      i.category_id,
      i.store_id,
      COALESCE(i.quantity_available, 0)::numeric AS current_stock,
      COALESCE(i.cost_price, 0)::numeric AS cost_price,
      COALESCE(i.selling_price, 0)::numeric AS selling_price,
      COALESCE(i.stock_receive_date, i.created_at::date, CURRENT_DATE) AS stock_date
    FROM public.items i
    WHERE i.store_id = _store_id
      AND COALESCE(i.is_discontinued, false) = false
  ),
  supplier_invoices AS (
    SELECT DISTINCT
      p.supplier_id AS supp_id,
      COALESCE(p.invoice_date::date, p.date::date) AS inv_date
    FROM public.purchases p
    WHERE p.supplier_id IS NOT NULL
  ),
  invoice_gaps AS (
    SELECT
      si.supp_id,
      si.inv_date - LAG(si.inv_date) OVER (PARTITION BY si.supp_id ORDER BY si.inv_date) AS gap_days
    FROM supplier_invoices si
  ),
  supplier_cadence AS (
    SELECT
      s.id AS supp_id,
      s.name AS supp_name,
      ROUND(COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY g.gap_days), 21)::numeric, 0)::int AS median_gap_days
    FROM public.suppliers s
    LEFT JOIN invoice_gaps g ON g.supp_id = s.id AND g.gap_days IS NOT NULL
    GROUP BY s.id, s.name
  ),
  item_last_purchase AS (
    SELECT
      p.item_id AS pur_item_id,
      MAX(COALESCE(p.invoice_date::date, p.date::date)) AS last_purchase_date
    FROM public.purchases p
    WHERE p.item_id IS NOT NULL
    GROUP BY p.item_id
  ),
  open_demand_cte AS (
    SELECT
      soi.item_id AS open_item_id,
      SUM(soi.quantity)::numeric AS open_demand
    FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    WHERE so.store_id = _store_id
      AND lower(COALESCE(so.delivery_status, '')) NOT IN ('delivered', 'cancelled')
      AND COALESCE(so.document_type, 'order') = 'order'
      AND soi.item_id IS NOT NULL
    GROUP BY soi.item_id
  ),
  category_rate_cte AS (
    SELECT
      c.id AS cat_id,
      c.name AS cat_name,
      COALESCE(SUM(soi.quantity) FILTER (WHERE so.date >= CURRENT_DATE - 365), 0)::numeric AS cat_units_365d,
      COUNT(DISTINCT soi.item_id) FILTER (WHERE so.date >= CURRENT_DATE - 365) AS cat_selling_items_count,
      ROUND(
        COALESCE(
          (SUM(soi.quantity) FILTER (WHERE so.date >= CURRENT_DATE - 365)::numeric / 12.0)
          / NULLIF(COUNT(DISTINCT soi.item_id) FILTER (WHERE so.date >= CURRENT_DATE - 365), 0),
          0.10
        ), 2
      ) AS cat_monthly_rate
    FROM public.categories c
    LEFT JOIN public.items i ON i.category_id = c.id AND COALESCE(i.is_discontinued, false) = false
    LEFT JOIN public.sales_order_items soi ON soi.item_id = i.id
    LEFT JOIN public.sales_orders so ON so.id = soi.order_id
      AND lower(COALESCE(so.delivery_status, '')) <> 'cancelled'
      AND COALESCE(so.document_type, 'order') = 'order'
    GROUP BY c.id, c.name
  ),
  item_sales_cte AS (
    SELECT
      soi.item_id AS sale_item_id,
      COUNT(DISTINCT so.id) AS orders_count_ever,
      MIN(so.date::date) AS first_sale_date,
      MAX(so.date::date) AS last_sale_date,
      COALESCE(SUM(soi.quantity) FILTER (WHERE so.date >= CURRENT_DATE - 30), 0)::numeric AS units_sold_30d,
      COALESCE(SUM(soi.quantity) FILTER (WHERE so.date >= CURRENT_DATE - 90), 0)::numeric AS units_sold_90d,
      COALESCE(SUM(soi.quantity) FILTER (WHERE so.date >= CURRENT_DATE - _window_days), 0)::numeric AS units_sold_365d,
      COUNT(DISTINCT so.id) FILTER (WHERE so.date >= CURRENT_DATE - 30)::int AS orders_count_30d,
      COUNT(DISTINCT so.id) FILTER (WHERE so.date >= CURRENT_DATE - 90)::int AS orders_count_90d,
      COUNT(DISTINCT so.id) FILTER (WHERE so.date >= CURRENT_DATE - _window_days)::int AS orders_count_365d,
      COUNT(DISTINCT to_char(so.date::date, 'YYYY-MM')) FILTER (WHERE so.date >= CURRENT_DATE - _window_days)::int AS selling_months_count,
      ROUND(
        COALESCE(
          SUM(soi.quantity) FILTER (WHERE so.date >= CURRENT_DATE - _window_days)::numeric / 
          NULLIF(COUNT(DISTINCT so.id) FILTER (WHERE so.date >= CURRENT_DATE - _window_days), 0),
          SUM(soi.quantity)::numeric / NULLIF(COUNT(DISTINCT so.id), 0),
          1.0
        ), 1
      ) AS avg_units_per_order
    FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    WHERE so.store_id = _store_id
      AND lower(COALESCE(so.delivery_status, '')) <> 'cancelled'
      AND COALESCE(so.document_type, 'order') = 'order'
      AND soi.item_id IS NOT NULL
    GROUP BY soi.item_id
  ),
  enriched AS (
    SELECT
      sti.item_id,
      sti.item_name,
      sti.brand,
      sti.warehouse,
      sti.category_id,
      COALESCE(cr.cat_name, 'Uncategorized') AS category_name,
      sti.supplier_id,
      COALESCE(sc.supp_name, 'Unassigned') AS supplier_name,
      sti.current_stock,
      COALESCE(od.open_demand, 0)::numeric AS open_demand,
      (sti.current_stock - COALESCE(od.open_demand, 0))::numeric AS net_stock,
      sti.cost_price,
      sti.selling_price,
      ROUND(sti.current_stock * sti.cost_price, 2) AS stock_value,
      COALESCE(_horizon_days, sc.median_gap_days, 21)::int AS supplier_lead_days,
      ilp.last_purchase_date,
      GREATEST((CURRENT_DATE - sti.stock_date)::int, 0) AS days_held,
      COALESCE(isc.units_sold_30d, 0)::numeric AS units_sold_30d,
      COALESCE(isc.units_sold_90d, 0)::numeric AS units_sold_90d,
      COALESCE(isc.units_sold_365d, 0)::numeric AS units_sold_365d,
      COALESCE(isc.orders_count_30d, 0)::int AS orders_count_30d,
      COALESCE(isc.orders_count_90d, 0)::int AS orders_count_90d,
      COALESCE(isc.orders_count_365d, 0)::int AS orders_count_365d,
      COALESCE(isc.orders_count_ever, 0)::int AS orders_count_ever,
      isc.first_sale_date,
      isc.last_sale_date,
      CASE WHEN isc.last_sale_date IS NOT NULL THEN (CURRENT_DATE - isc.last_sale_date)::int ELSE NULL END AS days_since_last_sale,
      COALESCE(isc.selling_months_count, 0)::int AS selling_months_count,
      COALESCE(isc.avg_units_per_order, 1.0)::numeric AS avg_units_per_order,
      COALESCE(cr.cat_monthly_rate, 0.10)::numeric AS cat_monthly_rate,
      CASE
        WHEN COALESCE(isc.orders_count_ever, 0) = 0 THEN 'no_history'
        WHEN isc.orders_count_ever = 1 THEN 'one_off'
        WHEN isc.orders_count_ever >= 2 AND COALESCE(isc.selling_months_count, 0) < 4 THEN 'intermittent'
        ELSE 'steady'
      END AS demand_class
    FROM store_items sti
    LEFT JOIN item_sales_cte isc ON isc.sale_item_id = sti.item_id
    LEFT JOIN open_demand_cte od ON od.open_item_id = sti.item_id
    LEFT JOIN supplier_cadence sc ON sc.supp_id = sti.supplier_id
    LEFT JOIN item_last_purchase ilp ON ilp.pur_item_id = sti.item_id
    LEFT JOIN category_rate_cte cr ON cr.cat_id = sti.category_id
    WHERE NOT (COALESCE(isc.orders_count_ever, 0) = 0 AND sti.current_stock <= 0)
  ),
  modeled AS (
    SELECT
      e.*,
      CASE
        WHEN e.demand_class = 'steady' THEN 'high'
        WHEN e.demand_class = 'intermittent' THEN 'medium'
        ELSE 'low'
      END AS confidence,
      CASE
        WHEN e.demand_class IN ('steady', 'intermittent') THEN 'own history'
        ELSE 'category benchmark'
      END AS demand_rate_basis,
      CASE
        WHEN e.demand_class = 'steady' THEN ROUND(e.units_sold_365d / GREATEST(_window_days / 30.0, 1.0), 2)
        WHEN e.demand_class = 'intermittent' THEN ROUND(GREATEST(e.units_sold_365d / GREATEST(_window_days / 30.0, 1.0), 0.05), 2)
        ELSE e.cat_monthly_rate
      END AS estimated_monthly_demand
    FROM enriched e
  ),
  decided AS (
    SELECT
      m.*,
      ROUND((m.estimated_monthly_demand / 30.0) * m.supplier_lead_days, 2) AS lead_time_demand,
      CASE
        WHEN m.estimated_monthly_demand > 0 THEN ROUND(m.net_stock / (m.estimated_monthly_demand / 30.0), 1)
        ELSE NULL
      END AS cover_days,
      CASE
        WHEN m.net_stock > 0 AND m.demand_class = 'no_history' THEN 'never_sold'
        WHEN m.net_stock > 0 AND (m.days_since_last_sale IS NOT NULL AND m.days_since_last_sale >= 180) THEN 'dead_stock'
        WHEN m.net_stock < ((m.estimated_monthly_demand / 30.0) * m.supplier_lead_days) THEN 'reorder_now'
        WHEN m.net_stock < (2.0 * ((m.estimated_monthly_demand / 30.0) * m.supplier_lead_days)) THEN 'reorder_soon'
        ELSE 'sell_through'
      END AS decision,
      GREATEST(ROUND(m.avg_units_per_order), 1)::numeric AS typical_lot
    FROM modeled m
  ),
  suggested AS (
    SELECT
      d.*,
      CASE
        WHEN d.decision IN ('reorder_now', 'reorder_soon') THEN
          GREATEST(
            CEIL(
              GREATEST(
                (d.lead_time_demand * 1.5) - d.net_stock,
                d.typical_lot
              ) / d.typical_lot
            ) * d.typical_lot,
            d.typical_lot
          )
        ELSE 0::numeric
      END AS suggested_qty
    FROM decided d
  )
  SELECT
    s.item_id,
    s.item_name,
    s.brand,
    s.warehouse,
    s.category_id,
    s.category_name,
    s.supplier_id,
    s.supplier_name,
    s.units_sold_30d,
    s.units_sold_90d,
    s.units_sold_365d,
    s.orders_count_30d,
    s.orders_count_90d,
    s.orders_count_365d,
    s.orders_count_ever,
    s.first_sale_date,
    s.last_sale_date,
    s.days_since_last_sale,
    s.selling_months_count,
    s.avg_units_per_order,
    s.demand_class,
    s.confidence,
    s.demand_rate_basis,
    s.estimated_monthly_demand,
    s.cat_monthly_rate AS category_monthly_rate,
    s.current_stock,
    s.open_demand,
    s.net_stock,
    s.cost_price,
    s.selling_price,
    s.stock_value,
    s.supplier_lead_days,
    s.last_purchase_date,
    s.days_held,
    s.decision,
    s.lead_time_demand,
    s.cover_days,
    s.suggested_qty,
    ROUND(s.suggested_qty * s.cost_price, 2) AS suggested_order_cost,
    CASE
      WHEN s.decision = 'never_sold' THEN
        'No sales recorded (held ' || s.days_held || ' days), category averages ' || s.cat_monthly_rate || ' pcs/mo, supplier cadence ~' || s.supplier_lead_days || ' days — ' || s.current_stock || ' in stock (₹' || s.stock_value || ' locked). Needs promotional push or clearance.'
      WHEN s.decision = 'dead_stock' THEN
        s.orders_count_365d || ' orders in 12m (' || s.units_sold_365d || ' pcs), last sold ' || s.days_since_last_sale || ' days ago, supplier cadence ~' || s.supplier_lead_days || ' days — ' || s.current_stock || ' in stock (₹' || s.stock_value || ' locked) with no sale in 180+ days. Clearance recommended.'
      WHEN s.decision = 'reorder_now' THEN
        s.orders_count_365d || ' orders in 12m (' || s.units_sold_365d || ' pcs), last sold ' || COALESCE(s.days_since_last_sale::text, 'never') || ' days ago, ' || 
        CASE WHEN s.demand_rate_basis = 'category benchmark' THEN 'category averages ' || s.cat_monthly_rate || ' pcs/mo' ELSE 'est. ' || s.estimated_monthly_demand || ' pcs/mo' END ||
        ', supplier cadence ~' || s.supplier_lead_days || ' days — net stock ' || s.net_stock || 
        CASE WHEN s.open_demand > 0 THEN ' (' || s.current_stock || ' on hand, ' || s.open_demand || ' reserved)' ELSE '' END ||
        ' cannot cover ' || s.lead_time_demand || ' pcs lead demand. Order ' || s.suggested_qty || ' pcs now.'
      WHEN s.decision = 'reorder_soon' THEN
        s.orders_count_365d || ' orders in 12m (' || s.units_sold_365d || ' pcs), supplier cadence ~' || s.supplier_lead_days || ' days — net stock ' || s.net_stock || ' covers ~' || COALESCE(s.cover_days::text, '?') || ' days, approaching supplier lead horizon. Plan reorder of ' || s.suggested_qty || ' pcs.'
      ELSE
        s.orders_count_365d || ' orders in 12m (' || s.units_sold_365d || ' pcs), last sold ' || COALESCE(s.days_since_last_sale::text, 'never') || ' days ago, supplier cadence ~' || s.supplier_lead_days || ' days — ' || s.current_stock || ' in stock covers ~' || COALESCE(s.cover_days::text, '60+') || ' days past horizon, no order needed.'
    END AS evidence_sentence,
    -- Aliases for compatibility
    s.current_stock AS quantity_available,
    s.units_sold_365d AS units_sold,
    s.days_since_last_sale AS days_since_sale,
    s.decision AS bucket
  FROM suggested s
  ORDER BY
    CASE s.decision
      WHEN 'reorder_now' THEN 1
      WHEN 'reorder_soon' THEN 2
      WHEN 'dead_stock' THEN 3
      WHEN 'never_sold' THEN 4
      ELSE 5
    END,
    CASE s.confidence
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      ELSE 3
    END,
    (s.suggested_qty * s.cost_price) DESC,
    s.stock_value DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_reorder_intelligence(uuid, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_reorder_intelligence(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reorder_intelligence(uuid, integer, integer) TO service_role;
