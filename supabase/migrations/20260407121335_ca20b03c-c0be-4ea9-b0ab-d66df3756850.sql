
-- 1. Add quote_status column
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS quote_status text DEFAULT 'draft';

-- 2. Drop old get_sales_orders_for_user to avoid overload conflicts
DROP FUNCTION IF EXISTS public.get_sales_orders_for_user(uuid, text);

-- 3. Recreate with quote_status in output
CREATE OR REPLACE FUNCTION public.get_sales_orders_for_user(
  _store_id uuid DEFAULT NULL,
  _document_type text DEFAULT 'order'
)
RETURNS TABLE (
  id uuid,
  order_number text,
  store_id uuid,
  supplier_id uuid,
  date text,
  total_amount numeric,
  created_at timestamptz,
  updated_at timestamptz,
  delivery_status text,
  advance_paid numeric,
  customer_name text,
  customer_phone text,
  customer_address text,
  description text,
  status text,
  balance_due numeric,
  delivered_at timestamptz,
  delivery_date text,
  document_type text,
  quote_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.order_number,
    so.store_id,
    so.supplier_id,
    so.date,
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
    so.delivery_date,
    so.document_type,
    so.quote_status
  FROM public.sales_orders so
  WHERE (_store_id IS NULL OR so.store_id = _store_id)
    AND public.user_has_store_access(so.store_id)
    AND COALESCE(so.document_type, 'order') = _document_type
  ORDER BY so.order_sequence DESC;
END;
$$;

-- 4. Update convert_quote_to_order to enforce accepted-only
DROP FUNCTION IF EXISTS public.convert_quote_to_order(uuid);

CREATE OR REPLACE FUNCTION public.convert_quote_to_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _doc_type text;
  _store_id uuid;
  _quote_status text;
BEGIN
  SELECT document_type, store_id, quote_status INTO _doc_type, _store_id, _quote_status
  FROM public.sales_orders
  WHERE id = _order_id;

  IF _doc_type IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF _doc_type != 'quote' THEN
    RAISE EXCEPTION 'Only quotes can be converted to orders';
  END IF;

  IF COALESCE(_quote_status, 'draft') != 'accepted' THEN
    RAISE EXCEPTION 'Only accepted quotes can be converted to orders. Current status: %', COALESCE(_quote_status, 'draft');
  END IF;

  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied: no store access';
  END IF;

  UPDATE public.sales_orders
  SET
    document_type = 'order',
    status = 'confirmed',
    stock_deducted = false,
    bom_processed = false,
    updated_at = now()
  WHERE id = _order_id;
END;
$$;

-- 5. Create RPC for updating quote status
CREATE OR REPLACE FUNCTION public.update_quote_status(_order_id uuid, _quote_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _doc_type text;
  _store_id uuid;
BEGIN
  SELECT document_type, store_id INTO _doc_type, _store_id
  FROM public.sales_orders
  WHERE id = _order_id;

  IF _doc_type IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF COALESCE(_doc_type, 'order') != 'quote' THEN
    RAISE EXCEPTION 'Can only update quote status for quotes';
  END IF;

  IF _quote_status NOT IN ('draft', 'sent', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid quote status: %', _quote_status;
  END IF;

  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied: no store access';
  END IF;

  UPDATE public.sales_orders
  SET quote_status = _quote_status, updated_at = now()
  WHERE id = _order_id;
END;
$$;
