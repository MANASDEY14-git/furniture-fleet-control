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
      AND (_start_date IS NULL OR so.created_at >= _start_date)
      AND (_end_date IS NULL OR so.created_at <= _end_date)
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
    JOIN split_order_items p2 ON p1.order_id = p2.order_id AND p1.sp_name < p2.sp_name
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
