
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS warehouse text;

CREATE INDEX IF NOT EXISTS idx_items_brand ON public.items(brand);
CREATE INDEX IF NOT EXISTS idx_items_warehouse ON public.items(warehouse);
CREATE INDEX IF NOT EXISTS idx_items_stock_receive_date ON public.items(stock_receive_date);

CREATE TABLE IF NOT EXISTS public.inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity_available numeric NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  stock_age_days integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, item_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_store_date
  ON public.inventory_snapshots(store_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_item_date
  ON public.inventory_snapshots(item_id, snapshot_date DESC);

GRANT SELECT ON public.inventory_snapshots TO authenticated;
GRANT ALL ON public.inventory_snapshots TO service_role;

ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view snapshots for their stores" ON public.inventory_snapshots;
CREATE POLICY "Users can view snapshots for their stores"
  ON public.inventory_snapshots
  FOR SELECT
  TO authenticated
  USING (public.user_has_store_access(store_id));

DROP FUNCTION IF EXISTS public.get_inventory_intelligence(
  uuid, date, date, uuid, uuid, text, text, integer, integer, numeric, numeric
);

CREATE OR REPLACE FUNCTION public.get_inventory_intelligence(
  p_store_id uuid DEFAULT NULL,
  p_date_from date DEFAULT (CURRENT_DATE - INTERVAL '180 days')::date,
  p_date_to date DEFAULT CURRENT_DATE,
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
  v_period_days integer := GREATEST(1, (p_date_to - p_date_from));
BEGIN
  RETURN QUERY
  WITH sales_agg AS (
    SELECT
      soi.item_id,
      COALESCE(SUM(soi.quantity), 0)::numeric AS units_sold,
      COALESCE(SUM(soi.total_price), 0)::numeric AS revenue,
      MAX(so.date) AS last_sold
    FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    WHERE so.date BETWEEN p_date_from AND p_date_to
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
