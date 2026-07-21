
-- Create trigger to add/update opening balance as a ledger entry when opening balance is set
CREATE OR REPLACE FUNCTION public.create_supplier_ledger_entry_for_opening_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete any existing opening_balance ledger entry for this supplier+store combo
  DELETE FROM public.supplier_ledger
  WHERE supplier_id = NEW.supplier_id
    AND store_id = NEW.store_id
    AND transaction_type = 'opening_balance';

  -- Insert new opening balance ledger entry
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
    'opening_balance',
    CASE WHEN NEW.balance_type = 'debit' THEN NEW.opening_balance ELSE 0 END,
    CASE WHEN NEW.balance_type = 'credit' THEN NEW.opening_balance ELSE 0 END,
    NULL,
    NULL,
    'Opening Balance',
    NEW.effective_date
  );

  RETURN NEW;
END;
$$;

-- Create trigger on supplier_opening_balances
CREATE TRIGGER create_supplier_ledger_on_opening_balance
  AFTER INSERT OR UPDATE ON public.supplier_opening_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.create_supplier_ledger_entry_for_opening_balance();

GRANT EXECUTE ON FUNCTION public.create_supplier_ledger_entry_for_opening_balance() TO authenticated;

-- Also update the supplier_ledger CHECK constraint to allow 'opening_balance' transaction_type
-- First check if there's a constraint
DO $$
BEGIN
  -- Try to drop existing constraint if it exists
  ALTER TABLE public.supplier_ledger DROP CONSTRAINT IF EXISTS supplier_ledger_transaction_type_check;
  -- Add updated constraint
  ALTER TABLE public.supplier_ledger ADD CONSTRAINT supplier_ledger_transaction_type_check 
    CHECK (transaction_type IN ('purchase', 'payment', 'opening_balance'));
EXCEPTION WHEN OTHERS THEN
  -- If no constraint exists, that's fine
  NULL;
END $$;
