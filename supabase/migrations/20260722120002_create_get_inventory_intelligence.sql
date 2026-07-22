-- Drop existing get_inventory_intelligence function if present
DROP FUNCTION IF EXISTS public.get_inventory_intelligence(uuid, date, date, uuid, uuid, text, text, text, numeric, numeric);

CREATE OR REPLACE FUNCTION public.get_inventory_intelligence(
  store_id_filter uuid DEFAULT NULL,
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL,
  category_id_filter uuid DEFAULT NULL,
  supplier_id_filter uuid DEFAULT NULL,
  brand_filter text DEFAULT NULL,
  warehouse_filter text DEFAULT NULL,
  age_bucket_filter text DEFAULT NULL,
  price_min numeric DEFAULT NULL,
  price_max numeric DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  image_url text,
  category_id uuid,
  category_name text,
  supplier_id uuid,
  supplier_name text,
  brand text,
  warehouse text,
  stock_receive_date date,
  quantity_available numeric,
  cost_price numeric,
  selling_price numeric,
  inventory_value numeric,
  inventory_cost numeric,
  revenue_period numeric,
  units_sold_period numeric,
  gross_profit_period numeric,
  last_sold_date date,
  days_since_last_sale integer,
  avg_days_between_sales numeric,
  stock_age_days integer,
  stock_age_bucket text,
  monthly_velocity numeric,
  days_to_sell numeric,
  stock_coverage_days numeric,
  reorder_status text,
  hero_score numeric,
  cash_locked numeric,
  recommended_action text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  effective_date_from date;
  effective_date_to date;
  days_in_period numeric;
  months_in_period numeric;
BEGIN
  -- Default date range: last 90 days if not provided
  effective_date_to := COALESCE(date_to, CURRENT_DATE);
  effective_date_from := COALESCE(date_from, effective_date_to - INTERVAL '90 days');
  days_in_period := GREATEST(1, (effective_date_to - effective_date_from) + 1);
  months_in_period := GREATEST(0.1, days_in_period / 30.0);

  RETURN QUERY
  WITH item_sales AS (
    SELECT 
      soi.item_id,
      COALESCE(SUM(soi.total_price), 0)::numeric AS revenue,
      COALESCE(SUM(soi.quantity), 0)::numeric AS units_sold,
      MAX(so.date::date) AS max_sale_date,
      COUNT(DISTINCT so.id)::numeric AS order_count,
      MIN(so.date::date) AS min_sale_date
    FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    WHERE soi.item_id IS NOT NULL
      AND (so.cancelled_at IS NULL)
      AND (so.delivery_status IS NULL OR LOWER(so.delivery_status) != 'cancelled')
      AND (so.status IS NULL OR LOWER(so.status) != 'cancelled')
      AND (so.date::date BETWEEN effective_date_from AND effective_date_to)
      AND (store_id_filter IS NULL OR so.store_id = store_id_filter)
    GROUP BY soi.item_id
  ),
  raw_items AS (
    SELECT
      i.id,
      i.name,
      i.image_url,
      i.category_id,
      c.name AS category_name,
      i.supplier_id,
      sup.name AS supplier_name,
      i.brand,
      i.warehouse,
      COALESCE(i.stock_receive_date, i.created_at::date, CURRENT_DATE) AS stock_receive_date,
      COALESCE(i.quantity_available, 0)::numeric AS quantity_available,
      COALESCE(i.cost_price, 0)::numeric AS cost_price,
      COALESCE(i.selling_price, 0)::numeric AS selling_price,
      
      -- Sales aggregations
      COALESCE(s.revenue, 0)::numeric AS revenue_period,
      COALESCE(s.units_sold, 0)::numeric AS units_sold_period,
      (COALESCE(s.revenue, 0) - (COALESCE(s.units_sold, 0) * COALESCE(i.cost_price, 0)))::numeric AS gross_profit_period,
      s.max_sale_date AS last_sold_date,
      
      CASE 
        WHEN s.max_sale_date IS NOT NULL THEN (CURRENT_DATE - s.max_sale_date)::integer
        ELSE NULL
      END AS days_since_last_sale,
      
      CASE
        WHEN COALESCE(s.order_count, 0) > 1 AND s.max_sale_date IS NOT NULL AND s.min_sale_date IS NOT NULL THEN
          ROUND(((s.max_sale_date - s.min_sale_date)::numeric / GREATEST(1, s.order_count - 1)), 1)
        ELSE NULL
      END AS avg_days_between_sales,

      (CURRENT_DATE - COALESCE(i.stock_receive_date, i.created_at::date, CURRENT_DATE))::integer AS stock_age_days
    FROM public.items i
    LEFT JOIN public.categories c ON c.id = i.category_id
    LEFT JOIN public.suppliers sup ON sup.id = i.supplier_id
    LEFT JOIN item_sales s ON s.item_id = i.id
    WHERE (store_id_filter IS NULL OR i.store_id = store_id_filter)
      AND (category_id_filter IS NULL OR i.category_id = category_id_filter)
      AND (supplier_id_filter IS NULL OR i.supplier_id = supplier_id_filter)
      AND (brand_filter IS NULL OR brand_filter = '' OR i.brand ILIKE '%' || brand_filter || '%')
      AND (warehouse_filter IS NULL OR warehouse_filter = '' OR i.warehouse ILIKE '%' || warehouse_filter || '%')
      AND (price_min IS NULL OR i.cost_price >= price_min)
      AND (price_max IS NULL OR i.cost_price <= price_max)
  ),
  computed_items AS (
    SELECT
      ri.*,
      (ri.quantity_available * ri.selling_price)::numeric AS inventory_value,
      (ri.quantity_available * ri.cost_price)::numeric AS inventory_cost,
      
      CASE
        WHEN ri.stock_age_days <= 180 THEN 'Healthy'
        WHEN ri.stock_age_days BETWEEN 181 AND 270 THEN 'Watch'
        WHEN ri.stock_age_days BETWEEN 271 AND 365 THEN 'Slow Moving'
        WHEN ri.stock_age_days BETWEEN 366 AND 540 THEN 'Dead Stock'
        ELSE 'Critical'
      END AS stock_age_bucket,
      
      ROUND((ri.units_sold_period / months_in_period)::numeric, 2) AS monthly_velocity,
      
      CASE
        WHEN ri.units_sold_period > 0 THEN 
          ROUND((ri.quantity_available / (ri.units_sold_period / days_in_period))::numeric, 1)
        ELSE 999.0
      END AS days_to_sell,

      CASE
        WHEN ri.stock_age_days > 180 THEN (ri.quantity_available * ri.cost_price)::numeric
        ELSE 0::numeric
      END AS cash_locked
    FROM raw_items ri
  ),
  ranked_items AS (
    SELECT
      ci.*,
      ci.days_to_sell AS stock_coverage_days,
      CASE
        WHEN ci.days_to_sell < 14 THEN 'Reorder Soon'
        WHEN ci.days_to_sell BETWEEN 14 AND 60 THEN 'Healthy'
        ELSE 'Overstocked'
      END AS reorder_status,
      
      -- Hero score composite formula (0 to 100) with explicit double precision to numeric casting
      ROUND(
        LEAST(100.0::numeric, GREATEST(0.0::numeric,
          ((PERCENT_RANK() OVER (ORDER BY ci.revenue_period ASC))::numeric * 35.0) +
          ((PERCENT_RANK() OVER (ORDER BY ci.gross_profit_period ASC))::numeric * 25.0) +
          ((PERCENT_RANK() OVER (ORDER BY ci.units_sold_period ASC))::numeric * 20.0) +
          (CASE WHEN ci.quantity_available > 0 THEN 10.0 ELSE 0.0 END) +
          (CASE WHEN ci.selling_price > ci.cost_price THEN LEAST(10.0::numeric, (((ci.selling_price - ci.cost_price) / NULLIF(ci.selling_price, 0)) * 20.0)::numeric) ELSE 0.0 END)
        )),
        1
      ) AS hero_score,

      CASE
        WHEN ci.stock_age_days > 365 THEN 'Clearance Sale'
        WHEN ci.stock_age_days BETWEEN 271 AND 365 THEN 'Discount'
        WHEN ci.stock_age_days BETWEEN 181 AND 270 THEN 'Bundle'
        WHEN ci.stock_age_days BETWEEN 181 AND 270 AND ci.units_sold_period > 0 THEN 'Increase Marketing'
        ELSE 'Keep Normal'
      END AS recommended_action
    FROM computed_items ci
  )
  SELECT
    r.id,
    r.name,
    r.image_url,
    r.category_id,
    r.category_name,
    r.supplier_id,
    r.supplier_name,
    r.brand,
    r.warehouse,
    r.stock_receive_date,
    r.quantity_available,
    r.cost_price,
    r.selling_price,
    r.inventory_value,
    r.inventory_cost,
    r.revenue_period,
    r.units_sold_period,
    r.gross_profit_period,
    r.last_sold_date,
    r.days_since_last_sale,
    r.avg_days_between_sales,
    r.stock_age_days,
    r.stock_age_bucket,
    r.monthly_velocity,
    r.days_to_sell,
    r.stock_coverage_days,
    r.reorder_status,
    r.hero_score,
    r.cash_locked,
    r.recommended_action
  FROM ranked_items r
  WHERE (age_bucket_filter IS NULL OR age_bucket_filter = '' OR r.stock_age_bucket = age_bucket_filter)
  ORDER BY r.hero_score DESC, r.inventory_value DESC;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_inventory_intelligence TO authenticated;
