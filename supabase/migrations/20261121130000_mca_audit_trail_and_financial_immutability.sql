-- Migration: 20261121130000_mca_audit_trail_and_financial_immutability.sql
-- Goal: Statutory Survival & MCA Audit Trail (Rule 3(1) of Companies Accounts Rules 2014 & Rule 11(g))

-- 1. Milestone 1.1: Database-Level Audit Trail Tamper-Proofing
-- Prohibit direct UPDATE or DELETE on audit_trails table.
CREATE OR REPLACE FUNCTION public.prevent_audit_trail_tampering()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Statutory Compliance Violation [MCA Rule 3(1)]: Records in audit_trails are strictly immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_protect_audit_trails ON public.audit_trails;
CREATE TRIGGER trg_protect_audit_trails
BEFORE UPDATE OR DELETE ON public.audit_trails
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_trail_tampering();

-- 2. Milestone 1.2: Mandatory User Attribution in audit_trigger()
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Try to get user_id from Supabase auth context
  v_user_id := auth.uid();
  
  -- 2. If null, check request.jwt.claims
  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  -- 3. If still null, try row attributes (user_id, created_by, updated_by)
  IF v_user_id IS NULL THEN
    BEGIN
      IF TG_OP = 'DELETE' THEN
        v_user_id := COALESCE(
          (pg_catalog.row_to_json(OLD)->>'user_id')::uuid,
          (pg_catalog.row_to_json(OLD)->>'created_by')::uuid,
          (pg_catalog.row_to_json(OLD)->>'updated_by')::uuid
        );
      ELSE
        v_user_id := COALESCE(
          (pg_catalog.row_to_json(NEW)->>'user_id')::uuid,
          (pg_catalog.row_to_json(NEW)->>'created_by')::uuid,
          (pg_catalog.row_to_json(NEW)->>'updated_by')::uuid
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_trails (table_name, record_id, action, old_data, user_id)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, pg_catalog.row_to_json(OLD)::jsonb, v_user_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_trails (table_name, record_id, action, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, pg_catalog.row_to_json(OLD)::jsonb, pg_catalog.row_to_json(NEW)::jsonb, v_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_trails (table_name, record_id, action, new_data, user_id)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, pg_catalog.row_to_json(NEW)::jsonb, v_user_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. Milestone 1.3: Attach Audit Triggers to 15 Omitted Core Financial Tables
DROP TRIGGER IF EXISTS audit_customer_ledger_trigger ON public.customer_ledger;
CREATE TRIGGER audit_customer_ledger_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_ledger
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_supplier_ledger_trigger ON public.supplier_ledger;
CREATE TRIGGER audit_supplier_ledger_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_ledger
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_material_purchases_trigger ON public.material_purchases;
CREATE TRIGGER audit_material_purchases_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.material_purchases
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_material_consumptions_trigger ON public.material_consumptions;
CREATE TRIGGER audit_material_consumptions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.material_consumptions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_material_stock_movements_trigger ON public.material_stock_movements;
CREATE TRIGGER audit_material_stock_movements_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.material_stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_stock_adjustments_trigger ON public.stock_adjustments;
CREATE TRIGGER audit_stock_adjustments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_stock_transfers_trigger ON public.stock_transfers;
CREATE TRIGGER audit_stock_transfers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_stock_transfer_lines_trigger ON public.stock_transfer_lines;
CREATE TRIGGER audit_stock_transfer_lines_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.stock_transfer_lines
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_item_opening_balances_trigger ON public.item_opening_balances;
CREATE TRIGGER audit_item_opening_balances_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.item_opening_balances
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_supplier_opening_balances_trigger ON public.supplier_opening_balances;
CREATE TRIGGER audit_supplier_opening_balances_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_opening_balances
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_bank_accounts_trigger ON public.bank_accounts;
CREATE TRIGGER audit_bank_accounts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_fin_transactions_trigger ON public.fin_transactions;
CREATE TRIGGER audit_fin_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.fin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_fin_transaction_entries_trigger ON public.fin_transaction_entries;
CREATE TRIGGER audit_fin_transaction_entries_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.fin_transaction_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_customers_trigger ON public.customers;
CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_suppliers_trigger ON public.suppliers;
CREATE TRIGGER audit_suppliers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 4. Milestone 1.4: Add Cancellation Columns & Block Hard Deletions on Financial Tables
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE public.purchases 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Prevent destructive hard-deletes on payments and purchases
CREATE OR REPLACE FUNCTION public.prevent_financial_record_deletion()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Statutory Compliance Violation [MCA Rule 3(1)]: Financial records in table "%" cannot be permanently deleted. Use cancellation (status = "cancelled") instead.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trg_prevent_delete_payments ON public.payments;
CREATE TRIGGER trg_prevent_delete_payments
BEFORE DELETE ON public.payments
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_financial_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_delete_purchases ON public.purchases;
CREATE TRIGGER trg_prevent_delete_purchases
BEFORE DELETE ON public.purchases
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_financial_record_deletion();

-- 5. Milestone 1.5: Bi-directional Bank Balance Sync (Insert & Cancellation)
CREATE OR REPLACE FUNCTION public.update_bank_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. On INSERT: apply effect if completed
  IF TG_OP = 'INSERT' THEN
    IF NEW.bank_account_id IS NOT NULL AND NEW.payment_status = 'completed' THEN
      IF NEW.type = 'Receipt' THEN
        UPDATE public.bank_accounts
        SET current_balance = current_balance + COALESCE(NEW.net_amount, NEW.amount),
            updated_at = NOW()
        WHERE id = NEW.bank_account_id;
      ELSIF NEW.type = 'Payment' THEN
        UPDATE public.bank_accounts
        SET current_balance = current_balance - COALESCE(NEW.net_amount, NEW.amount),
            updated_at = NOW()
        WHERE id = NEW.bank_account_id;
      END IF;
    END IF;
    RETURN NEW;
    
  -- 2. On UPDATE: handle cancellation transition
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.bank_account_id IS NOT NULL AND OLD.payment_status = 'completed' AND NEW.payment_status = 'cancelled' THEN
      IF OLD.type = 'Receipt' THEN
        -- Money came in, now reverse it (deduct)
        UPDATE public.bank_accounts
        SET current_balance = current_balance - COALESCE(OLD.net_amount, OLD.amount),
            updated_at = NOW()
        WHERE id = OLD.bank_account_id;
      ELSIF OLD.type = 'Payment' THEN
        -- Money went out, now reverse it (restore)
        UPDATE public.bank_accounts
        SET current_balance = current_balance + COALESCE(OLD.net_amount, OLD.amount),
            updated_at = NOW()
        WHERE id = OLD.bank_account_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS trigger_update_bank_balance ON public.payments;
CREATE TRIGGER trigger_update_bank_balance
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance();

-- 6. Milestone 1.6: Customer Ledger Sync on Payment Cancellation
CREATE OR REPLACE FUNCTION public.sync_payment_to_customer_ledger()
RETURNS TRIGGER AS $$
DECLARE
  _customer_id uuid;
BEGIN
  -- Handle cancellation
  IF TG_OP = 'UPDATE' AND NEW.payment_status = 'cancelled' AND OLD.payment_status != 'cancelled' THEN
    UPDATE public.customer_ledger
    SET 
      credit_amount = 0,
      notes = 'CANCELLED: ' || COALESCE(notes, '')
    WHERE reference_type = 'payment' AND reference_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Normal sync for receipts
  IF NEW.type = 'Receipt' AND NEW.reference_type = 'sales_order' AND NEW.sale_id IS NOT NULL AND NEW.payment_status != 'cancelled' THEN
    SELECT customer_id INTO _customer_id FROM public.sales_orders WHERE id = NEW.sale_id;
    
    IF _customer_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.customer_ledger WHERE reference_type = 'payment' AND reference_id = NEW.id) THEN
        UPDATE public.customer_ledger
        SET 
          credit_amount = NEW.amount,
          transaction_date = COALESCE(NEW.date::date, CURRENT_DATE),
          store_id = NEW.store_id
        WHERE reference_type = 'payment' AND reference_id = NEW.id;
      ELSE
        INSERT INTO public.customer_ledger (
          customer_id,
          store_id,
          transaction_type,
          debit_amount,
          credit_amount,
          reference_type,
          reference_id,
          transaction_date,
          notes
        ) VALUES (
          _customer_id,
          NEW.store_id,
          'payment',
          0,
          NEW.amount,
          'payment',
          NEW.id,
          COALESCE(NEW.date::date, CURRENT_DATE),
          'Payment ' || COALESCE(NEW.description, '')
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS sync_payment_customer_ledger_trigger ON public.payments;
CREATE TRIGGER sync_payment_customer_ledger_trigger
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_to_customer_ledger();
