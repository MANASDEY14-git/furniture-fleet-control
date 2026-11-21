ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_phone_2 text;

CREATE OR REPLACE FUNCTION public.create_sales_order_with_secondary_phone(
  _order_number text,
  _store_id uuid,
  _supplier_id uuid DEFAULT NULL::uuid,
  _date text DEFAULT NULL::text,
  _customer_name text DEFAULT NULL::text,
  _customer_phone text DEFAULT NULL::text,
  _customer_address text DEFAULT NULL::text,
  _delivery_date text DEFAULT NULL::text,
  _delivery_status text DEFAULT 'Pending'::text,
  _advance_paid numeric DEFAULT 0,
  _description text DEFAULT NULL::text,
  _total_amount numeric DEFAULT 0,
  _items jsonb DEFAULT '[]'::jsonb,
  _customizations jsonb DEFAULT '[]'::jsonb,
  _customer_id uuid DEFAULT NULL::uuid,
  _document_type text DEFAULT 'order'::text,
  _salesperson_name text DEFAULT NULL::text,
  _advance_payment_method text DEFAULT 'cash'::text,
  _advance_bank_account_id uuid DEFAULT NULL::uuid,
  _customer_phone_2 text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_order_id uuid;
BEGIN
  new_order_id := public.create_sales_order_secure(
    _order_number,
    _store_id,
    _supplier_id,
    _date,
    _customer_name,
    _customer_phone,
    _customer_address,
    _delivery_date,
    _delivery_status,
    _advance_paid,
    _description,
    _total_amount,
    _items,
    _customizations,
    _customer_id,
    _document_type,
    _salesperson_name,
    _advance_payment_method,
    _advance_bank_account_id
  );

  UPDATE public.sales_orders
  SET customer_phone_2 = NULLIF(BTRIM(_customer_phone_2), '')
  WHERE id = new_order_id;

  RETURN new_order_id;
END;
$function$;

DROP FUNCTION IF EXISTS public.get_sales_order_for_user(uuid);

CREATE FUNCTION public.get_sales_order_for_user(_order_id uuid)
RETURNS TABLE(
  id uuid,
  order_number text,
  store_id uuid,
  supplier_id uuid,
  date date,
  total_amount numeric,
  created_at timestamptz,
  updated_at timestamptz,
  delivery_status text,
  advance_paid numeric,
  customer_name text,
  customer_phone text,
  customer_phone_2 text,
  customer_address text,
  description text,
  status text,
  balance_due numeric,
  delivered_at timestamptz,
  delivery_date date,
  cancelled_at timestamptz,
  cancellation_reason text,
  sales_order_items jsonb,
  salesperson_name text,
  round_off numeric
)
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
    so.customer_phone_2,
    so.customer_address,
    so.description,
    so.status,
    so.balance_due,
    so.delivered_at,
    so.delivery_date,
    so.cancelled_at,
    so.cancellation_reason,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'id', soi.id,
          'order_id', soi.order_id,
          'item_id', soi.item_id,
          'item_name', soi.item_name,
          'quantity', soi.quantity,
          'unit_price', soi.unit_price,
          'total_price', soi.total_price,
          'supplier_id', soi.supplier_id,
          'variant_id', soi.variant_id,
          'variant_name', iv.variant_name,
          'variant_sku', iv.sku,
          'stock_deducted', soi.stock_deducted,
          'created_at', soi.created_at,
          'discount', soi.discount,
          'is_removed', COALESCE(soi.is_removed, false),
          'removed_at', soi.removed_at,
          'removed_by', soi.removed_by,
          'removal_reason', soi.removal_reason,
          'remover_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
        ) ORDER BY soi.created_at ASC)
        FROM public.sales_order_items soi
        LEFT JOIN public.item_variants iv ON iv.id = soi.variant_id
        LEFT JOIN public.profiles p ON p.user_id = soi.removed_by
        WHERE soi.order_id = so.id
      ),
      '[]'::jsonb
    ),
    so.salesperson_name,
    COALESCE(so.round_off, 0)
  FROM public.sales_orders so
  WHERE so.id = _order_id;
END;
$function$;