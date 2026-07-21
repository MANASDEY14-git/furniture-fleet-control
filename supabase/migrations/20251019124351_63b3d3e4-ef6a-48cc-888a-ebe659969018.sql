-- Phase 1: Banking & Payment Method Tracking System

-- 1. Create payment method enum
CREATE TYPE payment_method_type AS ENUM (
  'cash',
  'upi',
  'bank_transfer',
  'debit_card',
  'credit_card',
  'cheque',
  'online_wallet',
  'other'
);

-- 2. Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  ifsc_code TEXT,
  branch_name TEXT,
  account_type TEXT CHECK (account_type IN ('savings', 'current', 'od')),
  is_active BOOLEAN DEFAULT true,
  opening_balance NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on bank_accounts
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access bank accounts for their stores"
ON public.bank_accounts FOR ALL
USING (user_has_store_access(store_id));

-- 3. Extend payments table with banking fields
ALTER TABLE public.payments
ADD COLUMN payment_method payment_method_type DEFAULT 'cash',
ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
ADD COLUMN transaction_reference TEXT,
ADD COLUMN upi_id TEXT,
ADD COLUMN card_last_four TEXT,
ADD COLUMN payment_gateway TEXT,
ADD COLUMN cheque_number TEXT,
ADD COLUMN cheque_date DATE,
ADD COLUMN bank_charges NUMERIC DEFAULT 0,
ADD COLUMN net_amount NUMERIC GENERATED ALWAYS AS (amount - COALESCE(bank_charges, 0)) STORED,
ADD COLUMN payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
ADD COLUMN cleared_at TIMESTAMPTZ,
ADD COLUMN notes TEXT;

-- Create indexes for better query performance
CREATE INDEX idx_payments_payment_method ON public.payments(payment_method);
CREATE INDEX idx_payments_bank_account ON public.payments(bank_account_id);
CREATE INDEX idx_payments_status ON public.payments(payment_status);

-- 4. Create bank transaction ledger view
CREATE OR REPLACE VIEW public.bank_transaction_ledger AS
SELECT 
  p.id,
  p.date,
  p.type,
  p.amount,
  p.bank_charges,
  p.net_amount,
  p.payment_method,
  p.transaction_reference,
  p.payment_status,
  p.upi_id,
  p.card_last_four,
  p.payment_gateway,
  p.cheque_number,
  p.cheque_date,
  p.cleared_at,
  ba.account_name,
  ba.account_number,
  ba.bank_name,
  s.name as store_name,
  sup.name as supplier_name,
  p.description,
  p.created_at
FROM public.payments p
LEFT JOIN public.bank_accounts ba ON p.bank_account_id = ba.id
LEFT JOIN public.stores s ON p.store_id = s.id
LEFT JOIN public.suppliers sup ON p.supplier_id = sup.id
WHERE p.payment_method != 'cash'
ORDER BY p.date DESC;

-- 5. Create function to update bank account balance
CREATE OR REPLACE FUNCTION public.update_bank_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.bank_account_id IS NOT NULL AND NEW.payment_status = 'completed' THEN
    IF NEW.type = 'Receipt' THEN
      -- Money coming in
      UPDATE public.bank_accounts
      SET current_balance = current_balance + NEW.net_amount,
          updated_at = NOW()
      WHERE id = NEW.bank_account_id;
    ELSIF NEW.type = 'Payment' THEN
      -- Money going out
      UPDATE public.bank_accounts
      SET current_balance = current_balance - NEW.net_amount,
          updated_at = NOW()
      WHERE id = NEW.bank_account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Create trigger for bank balance updates
DROP TRIGGER IF EXISTS trigger_update_bank_balance ON public.payments;
CREATE TRIGGER trigger_update_bank_balance
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bank_balance();

GRANT EXECUTE ON FUNCTION public.update_bank_balance() TO authenticated;