
-- Fix: Supplier payments should go to credit side, not debit side
-- Purchases = Debit (increases amount owed)
-- Payments = Credit (decreases amount owed)

CREATE OR REPLACE FUNCTION public.create_supplier_ledger_entry_for_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only handle supplier payments (not receipts)
  IF NEW.type = 'Payment' AND NEW.supplier_id IS NOT NULL THEN
    INSERT INTO public.supplier_ledger (
      supplier_id,
      store_id,
      transaction_type,
      debit_amount,
      credit_amount,
      invoice_number,
      payment_reference,
      description,
      transaction_date
    ) VALUES (
      NEW.supplier_id,
      NEW.store_id,
      'payment',
      0,              -- Payments should NOT be debit
      NEW.amount,     -- Payments go to CREDIT side
      NULL,
      NEW.reference_type,
      COALESCE(NEW.description, 'Supplier Payment'),
      NEW.date
    );
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_supplier_ledger_entry_for_payment() TO authenticated;
