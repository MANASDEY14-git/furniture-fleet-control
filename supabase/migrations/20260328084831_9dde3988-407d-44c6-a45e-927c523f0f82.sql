
-- Update create_sales_order_secure to accept document_type
CREATE OR REPLACE FUNCTION public.create_sales_order_secure(
  _order_number text,
  _store_id uuid,
  _supplier_id uuid DEFAULT NULL,
  _date text DEFAULT NULL,
  _customer_name text DEFAULT NULL,
  _customer_phone text DEFAULT NULL,
  _customer_address text DEFAULT NULL,
  _delivery_date text DEFAULT NULL,
  _delivery_status text DEFAULT 'Pending',
  _advance_paid numeric DEFAULT 0,
  _description text DEFAULT NULL,
  _total_amount numeric DEFAULT 0,
  _items jsonb DEFAULT '[]'::jsonb,
  _customizations jsonb DEFAULT '[]'::jsonb,
  _customer_id uuid DEFAULT NULL,
  _document_type text DEFAULT 'order'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_order_id uuid;
  item_record jsonb;
  customization_record jsonb;
  _status text;
BEGIN
  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied: no store access';
  END IF;

  IF _document_type = 'quote' THEN
    _status := 'draft';
  ELSE
    _status := 'pending';
  END IF;

  INSERT INTO public.sales_orders (
    order_number, store_id, supplier_id, date,
    customer_name, customer_phone, customer_address,
    delivery_date, delivery_status, advance_paid,
    description, total_amount, customer_id,
    document_type, status, stock_deducted, bom_processed
  ) VALUES (
    _order_number, _store_id, _supplier_id, _date,
    _customer_name, _customer_phone, _customer_address,
    _delivery_date, _delivery_status, CASE WHEN _document_type = 'quote' THEN 0 ELSE _advance_paid END,
    _description, _total_amount, _customer_id,
    _document_type, _status, false, false
  ) RETURNING id INTO new_order_id;

  FOR customization_record IN SELECT * FROM jsonb_array_elements(_customizations)
  LOOP
    INSERT INTO public.sales_customizations (
      sale_id, bom_component_id, selected_material_id,
      selected_option_name, quantity_used
    ) VALUES (
      new_order_id,
      (customization_record->>'bom_component_id')::uuid,
      (customization_record->>'selected_material_id')::uuid,
      customization_record->>'selected_option_name',
      (customization_record->>'quantity_used')::numeric
    );
  END LOOP;

  FOR item_record IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO public.sales_order_items (
      order_id, item_id, item_name, variant_id,
      supplier_id, quantity, unit_price, total_price
    ) VALUES (
      new_order_id,
      (item_record->>'item_id')::uuid,
      item_record->>'item_name',
      (item_record->>'variant_id')::uuid,
      (item_record->>'supplier_id')::uuid,
      (item_record->>'quantity')::integer,
      (item_record->>'unit_price')::numeric,
      (item_record->>'total_price')::numeric
    );
  END LOOP;

  IF _document_type = 'order' AND _advance_paid > 0 THEN
    INSERT INTO public.payments (
      sale_id, store_id, amount, type, date,
      description, reference_type
    ) VALUES (
      new_order_id, _store_id, _advance_paid, 'Receipt', _date,
      'Advance payment for order ' || _order_number,
      'sales_order'
    );
  END IF;

  RETURN new_order_id;
END;
$$;

-- Update get_sales_orders_for_user to accept document_type filter
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
  document_type text
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
    so.document_type
  FROM public.sales_orders so
  WHERE (_store_id IS NULL OR so.store_id = _store_id)
    AND public.user_has_store_access(so.store_id)
    AND COALESCE(so.document_type, 'order') = _document_type
  ORDER BY so.order_sequence DESC;
END;
$$;
