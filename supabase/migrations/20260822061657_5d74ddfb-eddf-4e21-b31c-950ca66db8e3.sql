ALTER TABLE public.order_followups
  ADD COLUMN IF NOT EXISTS snooze_until date;

DROP FUNCTION IF EXISTS public.get_followup_worklist(uuid);

CREATE OR REPLACE FUNCTION public.get_followup_worklist(_store_id uuid)
 RETURNS TABLE(order_id uuid, order_number text, customer_id uuid, customer_name text, customer_phone text, order_date date, delivery_date date, total_amount numeric, collected numeric, balance_due numeric, delivery_status text, document_type text, quote_status text, kind text, age_days integer, age_bucket text, priority numeric, last_note text, last_followup_at timestamp with time zone, last_followup_by text, next_action_date date, snooze_until date, snoozed boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND lower(COALESCE(so.status, '')) <> 'cancelled'
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
           (ARRAY_AGG(f.created_by ORDER BY f.created_at DESC))[1] AS last_created_by,
           MAX(f.created_at) AS last_followup_at,
           MAX(f.next_action_date) AS next_action_date,
           MAX(f.snooze_until) AS snooze_until
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
         NULLIF(TRIM(CONCAT_WS(' ', pr.first_name, pr.last_name)), '') AS last_followup_by,
         l.next_action_date,
         l.snooze_until,
         COALESCE(l.snooze_until > CURRENT_DATE, false) AS snoozed
  FROM classified c
  LEFT JOIN latest l ON l.order_id = c.id
  LEFT JOIN public.profiles pr ON pr.user_id = l.last_created_by
  WHERE c.kind IS NOT NULL
  ORDER BY COALESCE(l.snooze_until > CURRENT_DATE, false) ASC, 17 DESC;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_followup_worklist(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_followup_worklist(uuid) TO authenticated;