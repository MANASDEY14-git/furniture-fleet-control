DROP FUNCTION IF EXISTS public.ai_get_sales_summary(uuid, date, date);
CREATE FUNCTION public.ai_get_sales_summary(_store_id uuid, _from date, _to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF COALESCE(auth.role(),'') <> 'service_role' AND current_user <> 'postgres' THEN
    IF auth.uid() IS NULL OR NOT public.user_has_store_access(_store_id) THEN RAISE EXCEPTION 'Access denied for this store'; END IF;
  END IF;
  WITH o AS (
    SELECT so.* FROM public.sales_orders so
    WHERE so.store_id = _store_id AND so.date BETWEEN _from AND _to
      AND COALESCE(so.document_type,'order') = 'order'
      AND lower(COALESCE(so.delivery_status,'')) <> 'cancelled'
      AND lower(COALESCE(so.status,'')) <> 'cancelled'
  )
  SELECT jsonb_build_object(
    'from', _from, 'to', _to,
    'orders', (SELECT count(*) FROM o),
    'revenue', (SELECT COALESCE(sum(total_amount),0) FROM o),
    'collected', (SELECT COALESCE(sum(total_amount - COALESCE(balance_due,0)),0) FROM o),
    'still_due', (SELECT COALESCE(sum(balance_due),0) FROM o),
    'delivered_orders', (SELECT count(*) FROM o WHERE lower(COALESCE(delivery_status,'')) = 'delivered'),
    'undelivered_orders', (SELECT count(*) FROM o WHERE lower(COALESCE(delivery_status,'')) <> 'delivered'),
    'cancelled_orders_excluded', (SELECT count(*) FROM public.sales_orders so WHERE so.store_id=_store_id AND so.date BETWEEN _from AND _to AND COALESCE(so.document_type,'order')='order' AND (lower(COALESCE(so.delivery_status,''))='cancelled' OR lower(COALESCE(so.status,''))='cancelled')),
    'top_items', (SELECT COALESCE(jsonb_agg(t),'[]') FROM (SELECT soi.item_name, sum(soi.quantity) units, sum(soi.total_price) value FROM public.sales_order_items soi JOIN o ON o.id = soi.order_id GROUP BY soi.item_name ORDER BY 3 DESC NULLS LAST LIMIT 10) t),
    'top_customers', (SELECT COALESCE(jsonb_agg(t),'[]') FROM (SELECT COALESCE(NULLIF(trim(customer_name),''),'Walk-in customer') customer, count(*) orders, sum(total_amount) value FROM o GROUP BY 1 ORDER BY 3 DESC LIMIT 10) t)
  ) INTO v;
  RETURN v;
END $$;

DROP FUNCTION IF EXISTS public.ai_get_cash_position(uuid);
CREATE FUNCTION public.ai_get_cash_position(_store_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.role(),'') <> 'service_role' AND current_user <> 'postgres' THEN
    IF auth.uid() IS NULL OR NOT public.user_has_store_access(_store_id) THEN RAISE EXCEPTION 'Access denied for this store'; END IF;
    IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') OR has_role(auth.uid(),'accountant')) THEN RAISE EXCEPTION 'Financial data requires admin, manager or accountant role'; END IF;
  END IF;
  RETURN jsonb_build_object(
    'total_balance', (SELECT COALESCE(sum(current_balance),0) FROM public.bank_accounts WHERE store_id=_store_id AND COALESCE(is_active,true)),
    'accounts', (SELECT COALESCE(jsonb_agg(jsonb_build_object('account', account_name, 'type', account_type, 'balance', current_balance) ORDER BY account_name),'[]') FROM public.bank_accounts WHERE store_id=_store_id AND COALESCE(is_active,true)));
END $$;

DROP FUNCTION IF EXISTS public.ai_get_payables(uuid);
CREATE FUNCTION public.ai_get_payables(_store_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  IF COALESCE(auth.role(),'') <> 'service_role' AND current_user <> 'postgres' THEN
    IF auth.uid() IS NULL OR NOT public.user_has_store_access(_store_id) THEN RAISE EXCEPTION 'Access denied for this store'; END IF;
    IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager') OR has_role(auth.uid(),'accountant')) THEN RAISE EXCEPTION 'Financial data requires admin, manager or accountant role'; END IF;
  END IF;
  WITH b AS (
    SELECT s.name supplier, sum(COALESCE(l.credit_amount,0) - COALESCE(l.debit_amount,0)) balance, max(l.transaction_date) last_entry
    FROM public.supplier_ledger l JOIN public.suppliers s ON s.id = l.supplier_id
    WHERE l.store_id = _store_id GROUP BY s.name)
  SELECT jsonb_build_object(
    'total_owed_to_suppliers', (SELECT COALESCE(sum(balance),0) FROM b WHERE balance > 0),
    'suppliers', (SELECT COALESCE(jsonb_agg(b ORDER BY balance DESC),'[]') FROM b WHERE balance <> 0)) INTO v;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.ai_get_sales_summary(uuid,date,date), public.ai_get_cash_position(uuid), public.ai_get_payables(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_get_sales_summary(uuid,date,date), public.ai_get_cash_position(uuid), public.ai_get_payables(uuid) TO authenticated, service_role;