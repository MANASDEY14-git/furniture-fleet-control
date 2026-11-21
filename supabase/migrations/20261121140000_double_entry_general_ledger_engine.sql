-- Migration: 20261121140000_double_entry_general_ledger_engine.sql
-- Goal: Phase 2 - True Double-Entry General Ledger Core Engine & Golden Rules Compliance

-- 1. Create Chart of Accounts (COA) Schema
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  classification VARCHAR(50) NOT NULL,
  normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('debit', 'credit')),
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coa_code ON public.chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_coa_type ON public.chart_of_accounts(account_type);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to chart_of_accounts" ON public.chart_of_accounts;
CREATE POLICY "Allow read access to chart_of_accounts" ON public.chart_of_accounts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow write to chart_of_accounts" ON public.chart_of_accounts;
CREATE POLICY "Allow write to chart_of_accounts" ON public.chart_of_accounts FOR ALL TO authenticated USING (true);

-- 2. Seed Standard Tally Chart of Accounts Structure
INSERT INTO public.chart_of_accounts (code, name, account_type, classification, normal_balance, is_group, description)
VALUES
  -- 1000: Assets (Debit)
  ('1000', 'Assets', 'asset', 'Primary Group', 'debit', true, 'Primary Assets Group'),
  ('1100', 'Fixed Assets', 'asset', 'Fixed Assets', 'debit', true, 'Long-term productive assets'),
  ('1110', 'Plant & Machinery', 'asset', 'Fixed Assets', 'debit', false, 'Workshop machinery and equipment'),
  ('1120', 'Furniture & Fixtures', 'asset', 'Fixed Assets', 'debit', false, 'Showroom and office furniture assets'),
  ('1130', 'Vehicles & Fleet', 'asset', 'Fixed Assets', 'debit', false, 'Delivery and logistics vehicles'),
  ('1200', 'Current Assets', 'asset', 'Current Assets', 'debit', true, 'Short-term and liquid assets'),
  ('1210', 'Cash-in-Hand', 'asset', 'Cash-in-Hand', 'debit', false, 'Physical cash in showroom and workshop cash drawers'),
  ('1220', 'Bank Accounts', 'asset', 'Bank Accounts', 'debit', true, 'Operating business bank accounts'),
  ('1221', 'Primary Operating Bank', 'asset', 'Bank Accounts', 'debit', false, 'Primary current account for collections & vendor disbursements'),
  ('1230', 'Sundry Debtors', 'asset', 'Sundry Debtors', 'debit', true, 'Accounts receivable from customers'),
  ('1231', 'Customer Receivables Control', 'asset', 'Sundry Debtors', 'debit', false, 'Control account for all customer sales receivables'),
  ('1240', 'Stock-in-Hand (Finished Goods)', 'asset', 'Stock-in-Hand', 'debit', false, 'Finished furniture inventory'),
  ('1250', 'Raw Materials Stock', 'asset', 'Stock-in-Hand', 'debit', false, 'Wood, fabric, hardware raw inventory'),

  -- 2000: Liabilities (Credit)
  ('2000', 'Liabilities', 'liability', 'Primary Group', 'credit', true, 'Primary Liabilities Group'),
  ('2100', 'Capital Account', 'liability', 'Capital Account', 'credit', true, 'Proprietor / Partner capital accounts'),
  ('2110', 'Owner Equity & Capital', 'equity', 'Capital Account', 'credit', false, 'Capital introduced by owners'),
  ('2200', 'Loans & Borrowings', 'liability', 'Loans (Liability)', 'credit', true, 'Secured and unsecured loans'),
  ('2300', 'Current Liabilities', 'liability', 'Current Liabilities', 'credit', true, 'Short-term obligations and debts'),
  ('2310', 'Sundry Creditors', 'liability', 'Sundry Creditors', 'credit', true, 'Accounts payable to suppliers and material vendors'),
  ('2311', 'Supplier Payables Control', 'liability', 'Sundry Creditors', 'credit', false, 'Control account for all supplier trade payables'),
  ('2320', 'Duties & Taxes (GST)', 'liability', 'Duties & Taxes', 'credit', true, 'Indian Goods and Services Tax accounts'),
  ('2321', 'Output CGST', 'liability', 'Duties & Taxes', 'credit', false, 'Central GST collected on intra-state sales'),
  ('2322', 'Output SGST', 'liability', 'Duties & Taxes', 'credit', false, 'State GST collected on intra-state sales'),
  ('2323', 'Output IGST', 'liability', 'Duties & Taxes', 'credit', false, 'Integrated GST collected on inter-state sales'),
  ('2324', 'Input CGST Credit', 'asset', 'Duties & Taxes', 'debit', false, 'Central GST paid on purchases (ITC)'),
  ('2325', 'Input SGST Credit', 'asset', 'Duties & Taxes', 'debit', false, 'State GST paid on purchases (ITC)'),
  ('2326', 'Input IGST Credit', 'asset', 'Duties & Taxes', 'debit', false, 'Integrated GST paid on purchases (ITC)'),

  -- 3000: Equity (Credit)
  ('3000', 'Equity', 'equity', 'Primary Group', 'credit', true, 'Retained earnings and reserves'),
  ('3100', 'Retained Earnings', 'equity', 'Reserves & Surplus', 'credit', false, 'Accumulated earnings of previous years'),

  -- 4000: Revenue & Income (Credit)
  ('4000', 'Income & Revenue', 'revenue', 'Primary Group', 'credit', true, 'Operating sales and other income'),
  ('4100', 'Sales Accounts', 'revenue', 'Sales Accounts', 'credit', true, 'Revenue from finished goods and custom orders'),
  ('4110', 'Showroom Furniture Sales', 'revenue', 'Sales Accounts', 'credit', false, 'Standard catalog retail sales'),
  ('4120', 'Custom Project Sales', 'revenue', 'Sales Accounts', 'credit', false, 'Bespoke manufacturing and custom projects'),
  ('4200', 'Other Direct Income', 'revenue', 'Direct Incomes', 'credit', false, 'Delivery fees, assembly charges, and scrap sales'),

  -- 5000: Expenses (Debit)
  ('5000', 'Expenses', 'expense', 'Primary Group', 'debit', true, 'Cost of sales and operational expenses'),
  ('5100', 'Purchase Accounts', 'expense', 'Purchase Accounts', 'debit', true, 'Direct raw materials procurement'),
  ('5110', 'Raw Material Purchases', 'expense', 'Purchase Accounts', 'debit', false, 'Wood, plywood, foam, metal procurement'),
  ('5120', 'Hardware & Consumables Purchases', 'expense', 'Purchase Accounts', 'debit', false, 'Fasteners, glue, lacquer, packaging'),
  ('5200', 'Direct Manufacturing Expenses', 'expense', 'Direct Expenses', 'debit', true, 'Factory wages and direct fabrication'),
  ('5210', 'Workshop Labor Wages', 'expense', 'Direct Expenses', 'debit', false, 'Carpenter and artisan fabrication labor'),
  ('5220', 'Inward Freight & Logistics', 'expense', 'Direct Expenses', 'debit', false, 'Transport cost for raw materials'),
  ('5300', 'Indirect Operational Expenses', 'expense', 'Indirect Expenses', 'debit', true, 'Showroom overheads and administration'),
  ('5310', 'Workshop & Showroom Electricity', 'expense', 'Indirect Expenses', 'debit', false, 'Power and utilities'),
  ('5320', 'Showroom & Warehouse Rent', 'expense', 'Indirect Expenses', 'debit', false, 'Premises rental expense'),
  ('5330', 'Vehicle Fuel & Fleet Maintenance', 'expense', 'Indirect Expenses', 'debit', false, 'Delivery van maintenance and fuel'),
  ('5340', 'Bank & Gateway Charges', 'expense', 'Indirect Expenses', 'debit', false, 'POS terminal and bank processing fees')
ON CONFLICT (code) DO NOTHING;

-- 3. Create General Ledger Tables
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  voucher_type VARCHAR(30) NOT NULL CHECK (voucher_type IN ('contra', 'payment', 'receipt', 'journal', 'sales', 'purchase', 'credit_note', 'debit_note')),
  store_id UUID REFERENCES public.stores(id),
  reference_type VARCHAR(50),
  reference_id UUID,
  narration TEXT,
  total_debit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  total_credit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_je_date ON public.journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_voucher_type ON public.journal_entries(voucher_type);
CREATE INDEX IF NOT EXISTS idx_je_reference ON public.journal_entries(reference_type, reference_id);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to journal_entries" ON public.journal_entries;
CREATE POLICY "Allow read access to journal_entries" ON public.journal_entries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow write to journal_entries" ON public.journal_entries;
CREATE POLICY "Allow write to journal_entries" ON public.journal_entries FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (debit_amount >= 0),
  credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00 CHECK (credit_amount >= 0),
  narration TEXT,
  line_order INT NOT NULL DEFAULT 1,
  CONSTRAINT chk_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_jel_entry_id ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account_id ON public.journal_entry_lines(account_id);

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to journal_entry_lines" ON public.journal_entry_lines;
CREATE POLICY "Allow read access to journal_entry_lines" ON public.journal_entry_lines FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow write to journal_entry_lines" ON public.journal_entry_lines;
CREATE POLICY "Allow write to journal_entry_lines" ON public.journal_entry_lines FOR ALL TO authenticated USING (true);

-- 4. Atomic Double-Entry Posting Function
CREATE OR REPLACE FUNCTION public.post_journal_entry_atomic(
  p_voucher_type VARCHAR,
  p_entry_date DATE,
  p_narration TEXT,
  p_store_id UUID,
  p_reference_type VARCHAR,
  p_reference_id UUID,
  p_lines JSONB
) RETURNS UUID AS $$
DECLARE
  v_entry_id UUID;
  v_entry_number VARCHAR(50);
  v_total_debit NUMERIC(15,2) := 0;
  v_total_credit NUMERIC(15,2) := 0;
  v_line JSONB;
  v_line_order INT := 1;
BEGIN
  -- 1. Calculate totals from lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_total_debit := v_total_debit + COALESCE((v_line->>'debit_amount')::NUMERIC, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit_amount')::NUMERIC, 0);
  END LOOP;

  -- 2. Strictly enforce Luca Pacioli Double-Entry equality: Debit == Credit
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Double-Entry Accounting Equality Violation: Total Debits (%) must equal Total Credits (%)', v_total_debit, v_total_credit;
  END IF;

  IF v_total_debit <= 0 THEN
    RAISE EXCEPTION 'Double-Entry Accounting Violation: Transaction amount must be greater than zero.';
  END IF;

  -- 3. Generate sequential entry number
  v_entry_number := UPPER(p_voucher_type) || '-' || TO_CHAR(COALESCE(p_entry_date, CURRENT_DATE), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6);

  -- 4. Insert Header
  INSERT INTO public.journal_entries (
    entry_number,
    entry_date,
    voucher_type,
    store_id,
    reference_type,
    reference_id,
    narration,
    total_debit,
    total_credit,
    status,
    created_by
  ) VALUES (
    v_entry_number,
    COALESCE(p_entry_date, CURRENT_DATE),
    p_voucher_type,
    p_store_id,
    p_reference_type,
    p_reference_id,
    p_narration,
    v_total_debit,
    v_total_credit,
    'posted',
    auth.uid()
  ) RETURNING id INTO v_entry_id;

  -- 5. Insert Lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO public.journal_entry_lines (
      journal_entry_id,
      account_id,
      debit_amount,
      credit_amount,
      narration,
      line_order
    ) VALUES (
      v_entry_id,
      (v_line->>'account_id')::UUID,
      COALESCE((v_line->>'debit_amount')::NUMERIC, 0),
      COALESCE((v_line->>'credit_amount')::NUMERIC, 0),
      v_line->>'narration',
      v_line_order
    );
    v_line_order := v_line_order + 1;
  END LOOP;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. Attach Audit Triggers to the new General Ledger tables
DROP TRIGGER IF EXISTS audit_chart_of_accounts_trigger ON public.chart_of_accounts;
CREATE TRIGGER audit_chart_of_accounts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_journal_entries_trigger ON public.journal_entries;
CREATE TRIGGER audit_journal_entries_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_journal_entry_lines_trigger ON public.journal_entry_lines;
CREATE TRIGGER audit_journal_entry_lines_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 6. Correct Golden Rules of Accounting in Supplier Ledger Functions
CREATE OR REPLACE FUNCTION public.create_supplier_ledger_entry_for_purchase()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.supplier_id IS NOT NULL THEN
    INSERT INTO public.supplier_ledger (
      supplier_id,
      store_id,
      transaction_type,
      debit_amount,
      credit_amount,
      invoice_number,
      description,
      transaction_date
    ) VALUES (
      NEW.supplier_id,
      NEW.store_id,
      'purchase',
      0,               -- Purchases increase liability: CREDIT the supplier (Credit the Giver)
      NEW.total_cost,
      NEW.invoice_number,
      'Purchase: ' || NEW.item_name,
      NEW.date
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.create_supplier_ledger_entry_for_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'Payment' AND NEW.supplier_id IS NOT NULL THEN
    INSERT INTO public.supplier_ledger (
      supplier_id,
      store_id,
      transaction_type,
      debit_amount,
      credit_amount,
      payment_reference,
      description,
      transaction_date
    ) VALUES (
      NEW.supplier_id,
      NEW.store_id,
      'payment',
      NEW.amount,      -- Payments decrease liability: DEBIT the supplier (Debit the Receiver)
      0,
      NEW.reference_type,
      COALESCE(NEW.description, 'Supplier Payment'),
      NEW.date
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 7. Normalize Historical Inversion in supplier_ledger
UPDATE public.supplier_ledger
SET 
  credit_amount = debit_amount,
  debit_amount = 0
WHERE transaction_type = 'purchase' AND debit_amount > 0 AND credit_amount = 0;

UPDATE public.supplier_ledger
SET 
  debit_amount = credit_amount,
  credit_amount = 0
WHERE transaction_type = 'payment' AND credit_amount > 0 AND debit_amount = 0;

-- 8. Create Trial Balance Analytical View
CREATE OR REPLACE VIEW public.view_trial_balance AS
SELECT 
  coa.id AS account_id,
  coa.code,
  coa.name,
  coa.account_type,
  coa.classification,
  coa.normal_balance,
  COALESCE(SUM(jel.debit_amount), 0) AS total_debit,
  COALESCE(SUM(jel.credit_amount), 0) AS total_credit,
  CASE 
    WHEN coa.normal_balance = 'debit' THEN COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0)
    ELSE COALESCE(SUM(jel.credit_amount), 0) - COALESCE(SUM(jel.debit_amount), 0)
  END AS net_balance
FROM public.chart_of_accounts coa
LEFT JOIN public.journal_entry_lines jel ON jel.account_id = coa.id
GROUP BY coa.id, coa.code, coa.name, coa.account_type, coa.classification, coa.normal_balance;

-- 9. Dual-Write Trigger: Auto-post balanced Journal Entries for Payments
CREATE OR REPLACE FUNCTION public.sync_payment_to_double_entry_gl()
RETURNS TRIGGER AS $$
DECLARE
  v_bank_account_id UUID;
  v_cash_account_id UUID;
  v_debtors_account_id UUID;
  v_creditors_account_id UUID;
  v_lines JSONB;
BEGIN
  -- Only sync completed non-cancelled payments
  IF NEW.payment_status = 'completed' THEN
    -- Look up standard COA accounts
    SELECT id INTO v_bank_account_id FROM public.chart_of_accounts WHERE code = '1221' LIMIT 1;
    SELECT id INTO v_cash_account_id FROM public.chart_of_accounts WHERE code = '1210' LIMIT 1;
    SELECT id INTO v_debtors_account_id FROM public.chart_of_accounts WHERE code = '1231' LIMIT 1;
    SELECT id INTO v_creditors_account_id FROM public.chart_of_accounts WHERE code = '2311' LIMIT 1;

    -- A. Customer Receipt (Money comes in, Customer debt reduces)
    IF NEW.type = 'Receipt' THEN
      v_lines := jsonb_build_array(
        jsonb_build_object(
          'account_id', CASE WHEN NEW.payment_method = 'cash' THEN v_cash_account_id ELSE v_bank_account_id END,
          'debit_amount', NEW.amount,
          'credit_amount', 0,
          'narration', 'Receipt via ' || COALESCE(NEW.payment_method::text, 'bank')
        ),
        jsonb_build_object(
          'account_id', v_debtors_account_id,
          'debit_amount', 0,
          'credit_amount', NEW.amount,
          'narration', 'Customer payment received: ' || COALESCE(NEW.description, '')
        )
      );

      PERFORM public.post_journal_entry_atomic(
        'receipt',
        NEW.date,
        COALESCE(NEW.description, 'Customer Receipt'),
        NEW.store_id,
        'payment',
        NEW.id,
        v_lines
      );

    -- B. Vendor Payment (Money goes out, Vendor liability reduces)
    ELSIF NEW.type = 'Payment' THEN
      v_lines := jsonb_build_array(
        jsonb_build_object(
          'account_id', v_creditors_account_id,
          'debit_amount', NEW.amount,
          'credit_amount', 0,
          'narration', 'Supplier liability settled: ' || COALESCE(NEW.description, '')
        ),
        jsonb_build_object(
          'account_id', CASE WHEN NEW.payment_method = 'cash' THEN v_cash_account_id ELSE v_bank_account_id END,
          'debit_amount', 0,
          'credit_amount', NEW.amount,
          'narration', 'Disbursed via ' || COALESCE(NEW.payment_method::text, 'bank')
        )
      );

      PERFORM public.post_journal_entry_atomic(
        'payment',
        NEW.date,
        COALESCE(NEW.description, 'Vendor Disbursement'),
        NEW.store_id,
        'payment',
        NEW.id,
        v_lines
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never abort operational payment creation if GL sync encounters missing mapping
  RAISE WARNING 'GL Sync Notice: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_sync_payment_to_double_entry ON public.payments;
CREATE TRIGGER trg_sync_payment_to_double_entry
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_to_double_entry_gl();
