DROP FUNCTION IF EXISTS public.get_sales_orders_for_user(uuid, text, date, date);

CREATE OR REPLACE FUNCTION public.get_sales_orders_for_user(
  _store_id uuid DEFAULT NULL::uuid,
  _document_type text DEFAULT 'order'::text,
  p_start_date date DEFAULT NULL::date,
  p_end_date date DEFAULT NULL::date
)
 RETURNS TABLE(
   id uuid,
   order_number text,
   store_id uuid,
   supplier_id uuid,
   date text,
   total_amount numeric,
   created_at timestamp with time zone,
   updated_at timestamp with time zone,
   delivery_status text,
   advance_paid numeric,
   customer_name text,
   customer_phone text,
   customer_address text,
   description text,
   status text,
   balance_due numeric,
   delivered_at timestamp with time zone,
   delivery_date text,
   document_type text,
   quote_status text,
   salesperson_name text,
   round_off numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    SELECT start_date, end_date
    INTO p_start_date, p_end_date
    FROM public.financial_years
    WHERE is_active = true AND is_closed = false
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT 
    so.id,
    so.order_number,
    so.store_id,
    so.supplier_id,
    so.date::text,
    so.total_amount,
    so.created_at,
    so.updated_at,
    so.delivery_status,
    so.advance_paid,
    so.customer_name,
    so.customer_phone,
    so.customer_address,
    so.description,
    so.status,
    so.balance_due,
    so.delivered_at,
    so.delivery_date::text,
    so.document_type,
    so.quote_status,
    so.salesperson_name,
    COALESCE(so.round_off, 0)
  FROM public.sales_orders so
  WHERE (_store_id IS NULL OR so.store_id = _store_id)
    AND so.date BETWEEN p_start_date AND p_end_date
    AND public.user_has_store_access(so.store_id)
    AND COALESCE(so.document_type, 'order') = _document_type
  ORDER BY so.order_sequence DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_sales_orders_for_user(uuid, text, date, date) TO authenticated, anon;
