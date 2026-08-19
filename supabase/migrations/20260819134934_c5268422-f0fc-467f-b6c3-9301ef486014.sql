DROP FUNCTION IF EXISTS public.get_sales_order_for_user(uuid);

CREATE OR REPLACE FUNCTION public.get_sales_order_for_user(_order_id uuid)
 RETURNS TABLE(id uuid, order_number text, store_id uuid, supplier_id uuid, date date, total_amount numeric, created_at timestamp with time zone, updated_at timestamp with time zone, delivery_status text, advance_paid numeric, customer_name text, customer_phone text, customer_address text, description text, status text, balance_due numeric, delivered_at timestamp with time zone, delivery_date date, cancelled_at timestamp with time zone, cancellation_reason text, sales_order_items jsonb, salesperson_name text, round_off numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sales_orders so
    WHERE so.id = _order_id
    AND public.user_has_store_access(so.store_id)
  ) THEN
    RETURN;
  END IF;

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
    so.cancelled_at,
    so.cancellation_reason,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', soi.id,
        'order_id', soi.order_id,
        'item_id', soi.item_id,
        'item_name', soi.item_name,
        'quantity', soi.quantity,
        'unit_price', soi.unit_price,
        'total_price', soi.total_price,
        'supplier_id', soi.supplier_id,
        'variant_id', soi.variant_id,
        'stock_deducted', soi.stock_deducted,
        'created_at', soi.created_at,
        'discount', soi.discount
      ))
      FROM public.sales_order_items soi
      WHERE soi.order_id = so.id),
      '[]'::jsonb
    ),
    so.salesperson_name,
    COALESCE(so.round_off, 0)
  FROM public.sales_orders so
  WHERE so.id = _order_id;
END;
$function$;