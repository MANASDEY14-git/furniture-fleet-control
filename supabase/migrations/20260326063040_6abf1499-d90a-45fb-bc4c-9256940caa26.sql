
-- Drop existing function first to avoid overload issues
DROP FUNCTION IF EXISTS public.create_sales_order_secure(text, uuid, uuid, date, text, text, text, date, text, numeric, text, numeric, jsonb, jsonb);

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
  _customizations jsonb DEFAULT '[]'::jsonb,
  _customer_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_order_id uuid;
  item_record jsonb;
  customization_record jsonb;
BEGIN
  -- Verify store access
  IF NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied: no store access';
  END IF;

  -- Insert the sales order
  INSERT INTO public.sales_orders (
    order_number, store_id, supplier_id, date,
    customer_name, customer_phone, customer_address,
    delivery_date, delivery_status, advance_paid,
    description, total_amount, customer_id
  ) VALUES (
    _order_number, _store_id, _supplier_id, _date,
    _customer_name, _customer_phone, _customer_address,
    _delivery_date, _delivery_status, _advance_paid,
    _description, _total_amount, _customer_id
  ) RETURNING id INTO new_order_id;

  -- Insert customizations first (before items, so triggers can find them)
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

  -- Insert order items (triggers will handle BOM deduction)
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

  -- Record advance payment if any
  IF _advance_paid > 0 THEN
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
