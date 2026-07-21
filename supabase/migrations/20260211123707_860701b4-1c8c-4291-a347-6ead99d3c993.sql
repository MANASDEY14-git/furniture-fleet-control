
CREATE OR REPLACE FUNCTION public.create_sales_order_secure(
  _order_number text,
  _store_id uuid,
  _supplier_id uuid DEFAULT NULL,
  _date date DEFAULT CURRENT_DATE,
  _customer_name text DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _customer_address text DEFAULT NULL,
  _delivery_date date DEFAULT NULL,
  _delivery_status text DEFAULT 'Pending',
  _advance_paid numeric DEFAULT 0,
  _description text DEFAULT NULL,
  _total_amount numeric DEFAULT 0,
  _items jsonb DEFAULT '[]'::jsonb,
  _customizations jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order_id uuid;
  item jsonb;
  cust jsonb;
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

  -- Insert customizations BEFORE items so the trigger can find them
  FOR cust IN SELECT * FROM jsonb_array_elements(_customizations)
  LOOP
    INSERT INTO public.sales_customizations (
      sale_id, bom_component_id, selected_material_id, selected_option_name, quantity_used
    ) VALUES (
      new_order_id,
      (cust->>'bom_component_id')::uuid,
      (cust->>'selected_material_id')::uuid,
      cust->>'selected_option_name',
      (cust->>'quantity_used')::numeric
    );
  END LOOP;

  -- Insert order items (trigger fires here and finds customizations)
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
