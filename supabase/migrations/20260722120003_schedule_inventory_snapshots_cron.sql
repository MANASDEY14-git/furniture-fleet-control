-- Schedule daily inventory snapshots cron job if pg_cron extension exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedue any previous job with same name if exists
    PERFORM cron.unschedule('daily-inventory-snapshot');
    
    -- Schedule job at 01:00 UTC daily
    PERFORM cron.schedule(
      'daily-inventory-snapshot',
      '0 1 * * *',
      $$ 
      INSERT INTO public.inventory_snapshots (
        store_id, item_id, snapshot_date, quantity_available, cost_price, selling_price,
        total_cost, total_value, age_days_avg, slow_moving_value, dead_stock_value, fast_moving_value
      )
      SELECT 
        i.store_id,
        i.id AS item_id,
        CURRENT_DATE AS snapshot_date,
        COALESCE(i.quantity_available, 0) AS quantity_available,
        COALESCE(i.cost_price, 0) AS cost_price,
        COALESCE(i.selling_price, 0) AS selling_price,
        (COALESCE(i.quantity_available, 0) * COALESCE(i.cost_price, 0)) AS total_cost,
        (COALESCE(i.quantity_available, 0) * COALESCE(i.selling_price, 0)) AS total_value,
        (CURRENT_DATE - COALESCE(i.stock_receive_date, i.created_at::date, CURRENT_DATE))::numeric AS age_days_avg,
        CASE WHEN (CURRENT_DATE - COALESCE(i.stock_receive_date, i.created_at::date, CURRENT_DATE)) BETWEEN 271 AND 365 THEN (COALESCE(i.quantity_available, 0) * COALESCE(i.cost_price, 0)) ELSE 0 END AS slow_moving_value,
        CASE WHEN (CURRENT_DATE - COALESCE(i.stock_receive_date, i.created_at::date, CURRENT_DATE)) > 365 THEN (COALESCE(i.quantity_available, 0) * COALESCE(i.cost_price, 0)) ELSE 0 END AS dead_stock_value,
        CASE WHEN (CURRENT_DATE - COALESCE(i.stock_receive_date, i.created_at::date, CURRENT_DATE)) <= 180 THEN (COALESCE(i.quantity_available, 0) * COALESCE(i.cost_price, 0)) ELSE 0 END AS fast_moving_value
      FROM public.items i
      ON CONFLICT (store_id, item_id, snapshot_date) DO UPDATE SET
        quantity_available = EXCLUDED.quantity_available,
        cost_price = EXCLUDED.cost_price,
        selling_price = EXCLUDED.selling_price,
        total_cost = EXCLUDED.total_cost,
        total_value = EXCLUDED.total_value,
        age_days_avg = EXCLUDED.age_days_avg,
        slow_moving_value = EXCLUDED.slow_moving_value,
        dead_stock_value = EXCLUDED.dead_stock_value,
        fast_moving_value = EXCLUDED.fast_moving_value,
        created_at = now();
      $$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron job scheduling skipped: %', SQLERRM;
END;
$$;
