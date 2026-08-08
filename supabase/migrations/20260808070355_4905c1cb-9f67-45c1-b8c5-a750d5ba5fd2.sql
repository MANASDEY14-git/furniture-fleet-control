-- =========================================================
-- 1. Cancellation with money settlement
-- =========================================================
CREATE OR REPLACE FUNCTION public.cancel_sales_order(
  _order_id uuid,
  _reason text,
  _settlement text DEFAULT 'credit',            -- 'refund' | 'credit'
  _refund_method public.payment_method_type DEFAULT 'cash',
  _refund_bank_account_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o RECORD;
  v_collected numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO o FROM public.sales_orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT public.user_has_store_access(o.store_id) THEN
    RAISE EXCEPTION 'Access denied for this store';
  END IF;

  IF lower(coalesce(o.delivery_status,'')) = 'cancelled' THEN
    RAISE EXCEPTION 'Order is already cancelled';
  END IF;

  IF _settlement NOT IN ('refund','credit') THEN
    RAISE EXCEPTION 'Settlement must be refund or credit';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_collected
  FROM public.payments
  WHERE sale_id = _order_id AND type = 'Receipt';

  -- Terminal cancellation (balance_due is a generated column; cancelled orders are
  -- excluded from every receivable calculation instead)
  UPDATE public.sales_orders
  SET delivery_status = 'Cancelled',
      cancellation_reason = _reason,
      cancelled_at = NOW(),
      updated_at = NOW()
  WHERE id = _order_id;

  -- Reverse the sale debit on the customer account (audit-preserving credit entry)
  IF o.customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.customer_ledger
      WHERE reference_type = 'sales_order_cancellation' AND reference_id = _order_id
    ) THEN
      INSERT INTO public.customer_ledger (
        customer_id, store_id, transaction_type, debit_amount, credit_amount,
        reference_type, reference_id, transaction_date, notes
      ) VALUES (
        o.customer_id, o.store_id, 'cancellation', 0, COALESCE(o.total_amount, 0),
        'sales_order_cancellation', _order_id, CURRENT_DATE,
        'Cancelled order ' || COALESCE(o.order_number, '') || ' — reversed from account'
      );
    END IF;
  END IF;

  -- Settle the money already collected
  IF _settlement = 'refund' AND v_collected > 0 THEN
    INSERT INTO public.payments (
      store_id, sale_id, amount, type, date, description,
      reference_type, reference_id, payment_method, bank_account_id,
      net_amount, payment_status, notes
    ) VALUES (
      o.store_id, _order_id, v_collected, 'Payment', CURRENT_DATE,
      'Refund for cancelled order ' || COALESCE(o.order_number, ''),
      'sales_order_refund', _order_id, _refund_method, _refund_bank_account_id,
      v_collected, 'completed', _reason
    );

    IF o.customer_id IS NOT NULL THEN
      INSERT INTO public.customer_ledger (
        customer_id, store_id, transaction_type, debit_amount, credit_amount,
        reference_type, reference_id, transaction_date, notes
      ) VALUES (
        o.customer_id, o.store_id, 'refund', v_collected, 0,
        'sales_order_refund', _order_id, CURRENT_DATE,
        'Refund paid for cancelled order ' || COALESCE(o.order_number, '')
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'order_id', _order_id,
    'settlement', _settlement,
    'amount_settled', CASE WHEN _settlement = 'refund' THEN v_collected ELSE 0 END,
    'credit_retained', CASE WHEN _settlement = 'credit' THEN v_collected ELSE 0 END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_sales_order(uuid, text, text, public.payment_method_type, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.cancel_sales_order(uuid, text, text, public.payment_method_type, uuid) TO authenticated;

-- Backfill existing cancelled orders: reverse the account debit,
-- and keep any advance already collected as customer credit (no fake refunds created).
INSERT INTO public.customer_ledger (
  customer_id, store_id, transaction_type, debit_amount, credit_amount,
  reference_type, reference_id, transaction_date, notes
)
SELECT so.customer_id, so.store_id, 'cancellation', 0, COALESCE(so.total_amount, 0),
       'sales_order_cancellation', so.id, COALESCE(so.cancelled_at::date, CURRENT_DATE),
       'Cancelled order ' || COALESCE(so.order_number, '') || ' — reversed from account (backfill)'
FROM public.sales_orders so
WHERE lower(coalesce(so.delivery_status,'')) = 'cancelled'
  AND so.customer_id IS NOT NULL
  AND COALESCE(so.total_amount, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_ledger cl
    WHERE cl.reference_type = 'sales_order_cancellation' AND cl.reference_id = so.id
  );

-- Keep the sale-to-ledger sync from re-debiting a cancelled order
CREATE OR REPLACE FUNCTION public.sync_sales_order_to_customer_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.document_type = 'order' AND NEW.customer_id IS NOT NULL
     AND lower(COALESCE(NEW.delivery_status, '')) <> 'cancelled' THEN

    IF EXISTS (SELECT 1 FROM public.customer_ledger WHERE reference_type = 'sales_order' AND reference_id = NEW.id) THEN
      UPDATE public.customer_ledger
      SET debit_amount = NEW.total_amount,
          transaction_date = COALESCE(NEW.date::date, CURRENT_DATE),
          store_id = NEW.store_id
      WHERE reference_type = 'sales_order' AND reference_id = NEW.id;
    ELSE
      INSERT INTO public.customer_ledger (
        customer_id, store_id, transaction_type, debit_amount, credit_amount,
        reference_type, reference_id, transaction_date, notes
      ) VALUES (
        NEW.customer_id, NEW.store_id, 'sale', NEW.total_amount, 0,
        'sales_order', NEW.id, COALESCE(NEW.date::date, CURRENT_DATE),
        'Sales Order ' || COALESCE(NEW.order_number, '')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================================
-- 2. Customer credit balance (derived from the ledger)
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_customer_credit(_customer_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT GREATEST(
    COALESCE(SUM(cl.credit_amount) - SUM(cl.debit_amount), 0),
    0
  )
  FROM public.customer_ledger cl
  WHERE cl.customer_id = _customer_id
    AND public.user_has_store_access(cl.store_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_credit(uuid) TO authenticated;

-- =========================================================
-- 3. Follow-up log
-- =========================================================
CREATE TABLE IF NOT EXISTS public.order_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id),
  kind text NOT NULL DEFAULT 'collection',
  note text,
  outcome text,
  next_action_date date,
  done_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_followups TO authenticated;
GRANT ALL ON public.order_followups TO service_role;

ALTER TABLE public.order_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store users can view followups" ON public.order_followups;
CREATE POLICY "Store users can view followups" ON public.order_followups
FOR SELECT TO authenticated
USING (public.user_has_store_access(store_id));

DROP POLICY IF EXISTS "Store users can add followups" ON public.order_followups;
CREATE POLICY "Store users can add followups" ON public.order_followups
FOR INSERT TO authenticated
WITH CHECK (public.user_has_store_access(store_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own followups" ON public.order_followups;
CREATE POLICY "Users can update own followups" ON public.order_followups
FOR UPDATE TO authenticated
USING (public.user_has_store_access(store_id) AND created_by = auth.uid())
WITH CHECK (public.user_has_store_access(store_id) AND created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own followups" ON public.order_followups;
CREATE POLICY "Users can delete own followups" ON public.order_followups
FOR DELETE TO authenticated
USING (public.user_has_store_access(store_id) AND created_by = auth.uid());

DROP TRIGGER IF EXISTS trg_order_followups_updated_at ON public.order_followups;
CREATE TRIGGER trg_order_followups_updated_at
BEFORE UPDATE ON public.order_followups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_order_followups_order ON public.order_followups(order_id);
CREATE INDEX IF NOT EXISTS idx_order_followups_store_next ON public.order_followups(store_id, next_action_date);

-- =========================================================
-- 4. Daily follow-up worklist
-- =========================================================
DROP FUNCTION IF EXISTS public.get_followup_worklist(uuid);
CREATE OR REPLACE FUNCTION public.get_followup_worklist(_store_id uuid)
RETURNS TABLE (
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
  last_followup_at timestamptz,
  next_action_date date,
  snoozed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied for this store';
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
           MAX(f.created_at) AS last_followup_at,
           MAX(f.next_action_date) AS next_action_date
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
         l.next_action_date,
         COALESCE(l.next_action_date > CURRENT_DATE, false) AS snoozed
  FROM classified c
  LEFT JOIN latest l ON l.order_id = c.id
  WHERE c.kind IS NOT NULL
  ORDER BY 18 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_followup_worklist(uuid) TO authenticated;

-- =========================================================
-- 5. Reorder & dead stock intelligence
-- =========================================================
DROP FUNCTION IF EXISTS public.get_reorder_intelligence(uuid, integer);
CREATE OR REPLACE FUNCTION public.get_reorder_intelligence(_store_id uuid, _window_days integer DEFAULT 90)
RETURNS TABLE (
  item_id uuid,
  item_name text,
  brand text,
  warehouse text,
  supplier_id uuid,
  supplier_name text,
  quantity_available numeric,
  cost_price numeric,
  selling_price numeric,
  stock_value numeric,
  units_sold numeric,
  weekly_velocity numeric,
  weeks_of_cover numeric,
  last_sale_date date,
  days_since_sale integer,
  suggested_qty numeric,
  bucket text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied for this store';
  END IF;

  RETURN QUERY
  WITH sold AS (
    SELECT soi.item_id,
           SUM(soi.quantity)::numeric AS units_sold,
           MAX(so.date::date) AS last_sale_date
    FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    WHERE so.store_id = _store_id
      AND lower(COALESCE(so.delivery_status, '')) <> 'cancelled'
      AND COALESCE(so.document_type, 'order') = 'order'
      AND so.date >= CURRENT_DATE - _window_days
      AND soi.item_id IS NOT NULL
    GROUP BY soi.item_id
  ),
  ever_sold AS (
    SELECT soi.item_id, MAX(so.date::date) AS last_sale_date
    FROM public.sales_order_items soi
    JOIN public.sales_orders so ON so.id = soi.order_id
    WHERE so.store_id = _store_id
      AND lower(COALESCE(so.delivery_status, '')) <> 'cancelled'
      AND soi.item_id IS NOT NULL
    GROUP BY soi.item_id
  ),
  calc AS (
    SELECT i.id,
           i.name,
           i.brand,
           i.warehouse,
           i.supplier_id,
           s.name AS supplier_name,
           COALESCE(i.quantity_available, 0)::numeric AS qty,
           COALESCE(i.cost_price, 0)::numeric AS cost_price,
           COALESCE(i.selling_price, 0)::numeric AS selling_price,
           COALESCE(sd.units_sold, 0)::numeric AS units_sold,
           ROUND(COALESCE(sd.units_sold, 0)::numeric / GREATEST(_window_days / 7.0, 1), 2) AS weekly_velocity,
           COALESCE(sd.last_sale_date, es.last_sale_date) AS last_sale_date
    FROM public.items i
    LEFT JOIN public.suppliers s ON s.id = i.supplier_id
    LEFT JOIN sold sd ON sd.item_id = i.id
    LEFT JOIN ever_sold es ON es.item_id = i.id
    WHERE i.store_id = _store_id
      AND COALESCE(i.is_discontinued, false) = false
  )
  SELECT c.id,
         c.name,
         c.brand,
         c.warehouse,
         c.supplier_id,
         c.supplier_name,
         c.qty,
         c.cost_price,
         c.selling_price,
         ROUND(c.qty * c.cost_price, 2) AS stock_value,
         c.units_sold,
         c.weekly_velocity,
         CASE WHEN c.weekly_velocity > 0
              THEN ROUND(c.qty / c.weekly_velocity, 1)
              ELSE NULL END AS weeks_of_cover,
         c.last_sale_date,
         CASE WHEN c.last_sale_date IS NULL THEN NULL
              ELSE (CURRENT_DATE - c.last_sale_date)::int END AS days_since_sale,
         CASE WHEN c.weekly_velocity > 0
              THEN GREATEST(CEIL(c.weekly_velocity * 4) - c.qty, 0)
              ELSE 0 END AS suggested_qty,
         CASE
           WHEN c.weekly_velocity > 0 AND c.qty / c.weekly_velocity <= 2 THEN 'reorder_now'
           WHEN c.weekly_velocity > 0 AND c.qty / c.weekly_velocity <= 4 THEN 'reorder_soon'
           WHEN c.weekly_velocity = 0 AND c.qty > 0
                AND (c.last_sale_date IS NULL OR c.last_sale_date < CURRENT_DATE - 90) THEN 'dead_stock'
           ELSE 'healthy'
         END AS bucket
  FROM calc c
  ORDER BY
    CASE
      WHEN c.weekly_velocity > 0 AND c.qty / c.weekly_velocity <= 2 THEN 1
      WHEN c.weekly_velocity > 0 AND c.qty / c.weekly_velocity <= 4 THEN 2
      WHEN c.weekly_velocity = 0 AND c.qty > 0 THEN 3
      ELSE 4
    END,
    (c.qty * c.cost_price) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_reorder_intelligence(uuid, integer) TO authenticated;