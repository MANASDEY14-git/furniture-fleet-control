ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS round_off numeric NOT NULL DEFAULT 0;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS round_off numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.create_sales_order_secure(_order_number text, _store_id uuid, _supplier_id uuid DEFAULT NULL::uuid, _date text DEFAULT NULL::text, _customer_name text DEFAULT NULL::text, _customer_phone text DEFAULT NULL::text, _customer_address text DEFAULT NULL::text, _delivery_date text DEFAULT NULL::text, _delivery_status text DEFAULT 'Pending'::text, _advance_paid numeric DEFAULT 0, _description text DEFAULT NULL::text, _total_amount numeric DEFAULT 0, _items jsonb DEFAULT '[]'::jsonb, _customizations jsonb DEFAULT '[]'::jsonb, _customer_id uuid DEFAULT NULL::uuid, _document_type text DEFAULT 'order'::text, _salesperson_name text DEFAULT NULL::text, _advance_payment_method text DEFAULT 'cash'::text, _advance_bank_account_id uuid DEFAULT NULL::uuid, _round_off numeric DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    customer_name, customer_phone, customer_address, salesperson_name,
    delivery_date, delivery_status, advance_paid,
    description, total_amount, round_off, customer_id,
    document_type, status, stock_deducted, bom_processed
  ) VALUES (
    _order_number,
    _store_id,
    _supplier_id,
    CAST(_date AS DATE),
    _customer_name,
    _customer_phone,
    _customer_address,
    _salesperson_name,
    CASE WHEN _delivery_date IS NOT NULL THEN CAST(_delivery_date AS DATE) ELSE NULL END,
    _delivery_status,
    CASE WHEN _document_type = 'quote' THEN 0 ELSE _advance_paid END,
    _description,
    _total_amount,
    COALESCE(_round_off, 0),
    _customer_id,
    _document_type,
    _status,
    false,
    false
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
      description, reference_type,
      payment_method, bank_account_id
    ) VALUES (
      new_order_id,
      _store_id,
      _advance_paid,
      'Receipt',
      CAST(_date AS DATE),
      'Advance payment for order ' || _order_number,
      'sales_order',
      CAST(_advance_payment_method AS payment_method_type),
      _advance_bank_account_id
    );
  END IF;

  RETURN new_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_supplier_ledger_entry_for_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  insert into public.supplier_ledger (
    supplier_id,
    store_id,
    transaction_type,
    debit_amount,
    credit_amount,
    invoice_number,
    payment_reference,
    description,
    transaction_date
  )
  values (
    new.supplier_id,
    new.store_id,
    'purchase',
    new.total_cost + coalesce(new.round_off, 0),
    0,
    new.invoice_number,
    null,
    'Auto-recorded purchase entry',
    coalesce(new.invoice_date, new.date)
  );

  return new;
END;
$function$;