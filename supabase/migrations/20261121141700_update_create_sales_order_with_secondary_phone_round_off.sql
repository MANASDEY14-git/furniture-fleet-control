-- Add _round_off support to create_sales_order_with_secondary_phone and drop obsolete 20-arg overload

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
  _customer_phone_2 text DEFAULT NULL::text,
  _round_off numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
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
    _advance_bank_account_id,
    COALESCE(_round_off, 0)
  );

  UPDATE public.sales_orders
  SET customer_phone_2 = NULLIF(BTRIM(_customer_phone_2), '')
  WHERE id = new_order_id;

  RETURN new_order_id;
END;
$function$;

DROP FUNCTION IF EXISTS public.create_sales_order_with_secondary_phone(text, uuid, uuid, text, text, text, text, text, text, numeric, text, numeric, jsonb, jsonb, uuid, text, text, text, uuid, text);

REVOKE ALL ON FUNCTION public.create_sales_order_with_secondary_phone(text, uuid, uuid, text, text, text, text, text, text, numeric, text, numeric, jsonb, jsonb, uuid, text, text, text, uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sales_order_with_secondary_phone(text, uuid, uuid, text, text, text, text, text, text, numeric, text, numeric, jsonb, jsonb, uuid, text, text, text, uuid, text, numeric) TO authenticated, service_role;
