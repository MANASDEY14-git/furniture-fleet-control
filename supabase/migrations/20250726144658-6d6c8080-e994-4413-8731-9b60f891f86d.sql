-- Fix remaining functions that don't have search_path set

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.create_supplier_ledger_entry_for_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
    new.total_cost,
    0,
    new.invoice_number,
    null,
    'Auto-recorded purchase entry',
    coalesce(new.invoice_date, new.date)
  );

  return new;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_supplier_ledger_entry_for_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only handle supplier payments (not receipts)
  if new.type = 'Payment' and new.supplier_id is not null then
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
    ) values (
      new.supplier_id,
      new.store_id,
      'payment',
      new.amount,
      0,
      null,
      new.reference_type,
      coalesce(new.description, 'Supplier Payment'),
      new.date
    );
  end if;

  return new;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_receipt_from_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  if new.advance_paid is not null and new.advance_paid > 0 then
    insert into public.payments (
      store_id,
      amount,
      type,
      supplier_id,
      sale_id,
      description,
      date,
      reference_type,
      reference_id
    ) values (
      new.store_id,
      new.advance_paid,
      'Receipt',
      null,
      new.id,
      concat('Advance for order ', new.order_number),
      new.date,
      'sales_order',
      new.id
    );
  end if;

  return new;
END;
$$;