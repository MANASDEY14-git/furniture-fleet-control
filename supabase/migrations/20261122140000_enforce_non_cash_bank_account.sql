-- Migration: 20261122140000_enforce_non_cash_bank_account.sql
-- Description:
-- 1. Enforce bank_account_id is mandatory for all non-cash payment transactions.
-- 2. Enhance update_bank_balance() to handle bank account assignment and changes on existing payments.
-- 3. Retroactively link payment a68c5a05-688a-40c4-b181-6c56e83d885e (BC-15-D/1433) to HDFC Bank and update balance.
-- 4. Clean up legacy overload of create_sales_order_secure and add bank account validation for non-cash advance.

-- Step 1: Enhance update_bank_balance() to handle assignment / reassignment
CREATE OR REPLACE FUNCTION public.update_bank_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- 1. On INSERT: apply effect if completed and has bank account
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
    
  -- 2. On UPDATE:
  ELSIF TG_OP = 'UPDATE' THEN
    -- Scenario A: Cancellation transition
    IF OLD.bank_account_id IS NOT NULL AND OLD.payment_status = 'completed' AND NEW.payment_status = 'cancelled' THEN
      IF OLD.type = 'Receipt' THEN
        UPDATE public.bank_accounts
        SET current_balance = current_balance - COALESCE(OLD.net_amount, OLD.amount),
            updated_at = NOW()
        WHERE id = OLD.bank_account_id;
      ELSIF OLD.type = 'Payment' THEN
        UPDATE public.bank_accounts
        SET current_balance = current_balance + COALESCE(OLD.net_amount, OLD.amount),
            updated_at = NOW()
        WHERE id = OLD.bank_account_id;
      END IF;

    -- Scenario B: Bank account newly assigned to a previously unassigned completed payment
    ELSIF OLD.bank_account_id IS NULL AND NEW.bank_account_id IS NOT NULL AND NEW.payment_status = 'completed' THEN
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

    -- Scenario C: Bank account switched from one bank to another
    ELSIF OLD.bank_account_id IS NOT NULL AND NEW.bank_account_id IS NOT NULL AND OLD.bank_account_id <> NEW.bank_account_id AND NEW.payment_status = 'completed' THEN
      -- Reverse from OLD
      IF OLD.type = 'Receipt' THEN
        UPDATE public.bank_accounts
        SET current_balance = current_balance - COALESCE(OLD.net_amount, OLD.amount),
            updated_at = NOW()
        WHERE id = OLD.bank_account_id;
      ELSIF OLD.type = 'Payment' THEN
        UPDATE public.bank_accounts
        SET current_balance = current_balance + COALESCE(OLD.net_amount, OLD.amount),
            updated_at = NOW()
        WHERE id = OLD.bank_account_id;
      END IF;

      -- Apply to NEW
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
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 2: Fix yesterday's locked payment a68c5a05-688a-40c4-b181-6c56e83d885e (linking to HDFC CURRENT)
UPDATE public.payments
SET bank_account_id = 'fd9a4b8d-298b-42f3-a0ad-d5497f3ea13a'
WHERE id = 'a68c5a05-688a-40c4-b181-6c56e83d885e'
  AND bank_account_id IS NULL;

-- Step 3: Enforce bank_account_id validation trigger on public.payments
CREATE OR REPLACE FUNCTION public.validate_payment_bank_account()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.payment_method <> 'cash' AND NEW.bank_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid bank account is mandatory for non-cash (%) transactions.', NEW.payment_method;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_payment_bank_account ON public.payments;
CREATE TRIGGER trg_validate_payment_bank_account
BEFORE INSERT OR UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.validate_payment_bank_account();

-- Step 4: Drop obsolete 19-param overload of create_sales_order_secure if exists
DROP FUNCTION IF EXISTS public.create_sales_order_secure(text, uuid, uuid, text, text, text, text, text, text, numeric, text, numeric, jsonb, jsonb, uuid, text, text, text, uuid);

-- Step 5: Update create_sales_order_secure (20 params) with non-cash bank account validation
CREATE OR REPLACE FUNCTION public.create_sales_order_secure(
  _order_number text,
  _store_id uuid,
  _supplier_id uuid DEFAULT NULL::uuid,
  _date text DEFAULT NULL::text,
  _customer_name text DEFAULT NULL::text,
  _customer_phone text DEFAULT NULL::text,
  _customer_address text DEFAULT NULL::text,
  _delivery_date text DEFAULT NULL::text,
  _delivery_status text DEFAULT 'Pending'::text,
  _advance_paid numeric DEFAULT 0,
  _description text DEFAULT NULL::text,
  _total_amount numeric DEFAULT 0,
  _items jsonb DEFAULT '[]'::jsonb,
  _customizations jsonb DEFAULT '[]'::jsonb,
  _customer_id uuid DEFAULT NULL::uuid,
  _document_type text DEFAULT 'order'::text,
  _salesperson_name text DEFAULT NULL::text,
  _advance_payment_method text DEFAULT 'cash'::text,
  _advance_bank_account_id uuid DEFAULT NULL::uuid,
  _round_off numeric DEFAULT 0
)
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

  -- Validate mandatory bank account for non-cash advance payment
  IF _document_type = 'order' AND _advance_paid > 0 AND _advance_payment_method <> 'cash' AND _advance_bank_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid bank account is mandatory for non-cash (%) advance payments.', _advance_payment_method;
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
