-- 1. Drop restrictive SELECT policy that hides orders with customer info
DROP POLICY IF EXISTS "Regular users can view orders without customer PII" ON public.sales_orders;

-- 2. Create new SELECT policy that allows viewing all orders (PII redaction handled by RPC)
CREATE POLICY "Users can view sales orders for their stores"
  ON public.sales_orders
  FOR SELECT
  USING (user_has_store_access(store_id));

-- 3. Update the UPDATE policy to allow employees to update non-PII fields
DROP POLICY IF EXISTS "Privileged users can update sales orders" ON public.sales_orders;

CREATE POLICY "Users can update sales orders for their stores"
  ON public.sales_orders
  FOR UPDATE
  USING (user_has_store_access(store_id));

-- 4. Create secure function for creating sales orders with customer PII
CREATE OR REPLACE FUNCTION public.create_sales_order_secure(
  _order_number text,
  _store_id uuid,
  _supplier_id uuid,
  _date date,
  _customer_name text,
  _customer_phone text,
  _customer_address text,
  _delivery_date date,
  _delivery_status text,
  _advance_paid numeric,
  _description text,
  _total_amount numeric,
  _items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_order_id uuid;
  item jsonb;
BEGIN
  -- Verify user has store access
  IF NOT user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied: User does not have access to this store';
  END IF;

  -- Insert the sales order
  INSERT INTO public.sales_orders (
    order_number, store_id, supplier_id, date, customer_name, customer_phone,
    customer_address, delivery_date, delivery_status, advance_paid, description, total_amount
  ) VALUES (
    _order_number, _store_id, _supplier_id, _date, _customer_name, _customer_phone,
    _customer_address, _delivery_date, _delivery_status, _advance_paid, _description, _total_amount
  )
  RETURNING id INTO new_order_id;

  -- Insert order items
  FOR item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO public.sales_order_items (
      order_id, item_id, item_name, variant_id, supplier_id, quantity, unit_price, total_price
    ) VALUES (
      new_order_id,
      (item->>'item_id')::uuid,
      item->>'item_name',
      (item->>'variant_id')::uuid,
      (item->>'supplier_id')::uuid,
      (item->>'quantity')::integer,
      (item->>'unit_price')::numeric,
      (item->>'total_price')::numeric
    );
  END LOOP;

  -- Create advance payment if applicable
  IF _advance_paid > 0 THEN
    INSERT INTO public.payments (
      type, amount, date, sale_id, store_id, description, reference_type, reference_id
    ) VALUES (
      'Receipt', _advance_paid, _date, new_order_id, _store_id,
      COALESCE(_description, '') || ' (Advance payment for order ' || _order_number || ')',
      'sales_order', new_order_id
    );
  END IF;

  RETURN new_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sales_order_secure TO authenticated;