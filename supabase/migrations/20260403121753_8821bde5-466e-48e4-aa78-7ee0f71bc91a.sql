
CREATE OR REPLACE FUNCTION public.convert_quote_to_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _doc_type text;
  _store_id uuid;
BEGIN
  -- Verify the record exists and is a quote
  SELECT document_type, store_id INTO _doc_type, _store_id
  FROM public.sales_orders
  WHERE id = _order_id;

  IF _doc_type IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF _doc_type != 'quote' THEN
    RAISE EXCEPTION 'Only quotes can be converted to orders';
  END IF;

  -- Verify user has store access
  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied: no store access';
  END IF;

  -- Convert quote to order
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
