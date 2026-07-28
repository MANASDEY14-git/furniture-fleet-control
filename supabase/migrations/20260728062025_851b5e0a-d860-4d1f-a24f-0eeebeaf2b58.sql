-- 1. Enhanced perform_year_end_closing: also snapshot customers + seed item/customer opening balances
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
  IF v_year.is_closed THEN RAISE EXCEPTION 'This financial year is already closed'; END IF;

  v_next_start := v_year.end_date + 1;
  v_next_end := v_next_start + INTERVAL '364 days';
  v_next_label := 'FY ' || EXTRACT(YEAR FROM v_next_start)::text || '-' ||
                  SUBSTRING(EXTRACT(YEAR FROM v_next_end)::text FROM 3 FOR 2);

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

  -- Carry-forward supplier openings
  INSERT INTO public.supplier_opening_balances
    (supplier_id, store_id, opening_balance, balance_type, effective_date, notes, financial_year_id)
  SELECT yes.entity_id, yes.store_id, yes.closing_amount, yes.balance_type,
         v_next_start, 'Carried forward from ' || v_year.label, v_next_year_id
  FROM public.year_end_snapshots yes
  WHERE yes.financial_year_id = p_year_id AND yes.snapshot_type = 'supplier_balance'
  ON CONFLICT DO NOTHING;

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
  WHERE yes.financial_year_id = p_year_id AND yes.snapshot_type = 'stock'
  ON CONFLICT DO NOTHING;

  -- Mark year closed and activate the new one
  UPDATE public.financial_years SET is_closed = true, closed_at = now(), closed_by = auth.uid(), is_active = false WHERE id = p_year_id;
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

-- 2. Get active FY
CREATE OR REPLACE FUNCTION public.get_active_financial_year()
RETURNS SETOF public.financial_years
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.financial_years
  WHERE is_active = true AND is_closed = false
    AND CURRENT_DATE BETWEEN start_date AND end_date
  ORDER BY start_date DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_financial_year() TO authenticated, anon;

-- 3. Auto-close & rollover (idempotent - safe to call daily)
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
  RETURN jsonb_build_object('rolled_over', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_and_rollover_financial_year() TO authenticated;

-- 4. Backfill missing item and customer opening balances for currently active FY (FY 2026-27)
-- from the already-closed FY snapshots (FY 2025-26).
INSERT INTO public.item_opening_balances
  (item_id, store_id, financial_year_id, opening_quantity, opening_unit_cost, opening_value, effective_date, notes)
SELECT yes.entity_id, yes.store_id, fy_new.id,
       yes.closing_quantity,
       COALESCE((yes.metadata->>'cost_price')::numeric, 0),
       COALESCE(yes.closing_amount, yes.closing_quantity * COALESCE((yes.metadata->>'cost_price')::numeric, 0)),
       fy_new.start_date,
       'Backfilled from ' || fy_old.label
FROM public.year_end_snapshots yes
JOIN public.financial_years fy_old ON fy_old.id = yes.financial_year_id AND fy_old.is_closed = true
JOIN public.financial_years fy_new ON fy_new.start_date = fy_old.end_date + 1
WHERE yes.snapshot_type = 'stock'
  AND NOT EXISTS (
    SELECT 1 FROM public.item_opening_balances iob
    WHERE iob.item_id = yes.entity_id
      AND iob.store_id = yes.store_id
      AND iob.financial_year_id = fy_new.id
  );