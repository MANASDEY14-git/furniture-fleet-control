-- Add 'accountant' role to app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'accountant' 
    AND enumtypid = 'app_role'::regtype
  ) THEN
    ALTER TYPE app_role ADD VALUE 'accountant';
  END IF;
END $$;

-- Enable RLS on bank_transaction_ledger (it's a view, so we'll handle it differently)
-- First, check if it's a materialized view or regular view
-- If it's a regular view, we need to ensure the underlying tables (payments, bank_accounts) have proper RLS

-- Since bank_transaction_ledger is a view, we'll create a security definer function
-- that enforces role-based access control

CREATE OR REPLACE FUNCTION public.get_bank_transactions(
  _store_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  date date,
  amount numeric,
  bank_charges numeric,
  net_amount numeric,
  type text,
  description text,
  supplier_name text,
  payment_method payment_method_type,
  payment_status text,
  transaction_reference text,
  bank_name text,
  account_name text,
  account_number text,
  store_name text,
  cheque_number text,
  cheque_date date,
  cleared_at timestamp with time zone,
  upi_id text,
  card_last_four text,
  payment_gateway text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify user has financial management role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'manager', 'accountant')
  ) THEN
    RAISE EXCEPTION 'Access denied: Financial management role required';
  END IF;

  -- Return filtered bank transactions
  RETURN QUERY
  SELECT 
    btl.id,
    btl.date,
    btl.amount,
    btl.bank_charges,
    btl.net_amount,
    btl.type,
    btl.description,
    btl.supplier_name,
    btl.payment_method,
    btl.payment_status,
    btl.transaction_reference,
    btl.bank_name,
    btl.account_name,
    btl.account_number,
    btl.store_name,
    btl.cheque_number,
    btl.cheque_date,
    btl.cleared_at,
    btl.upi_id,
    btl.card_last_four,
    btl.payment_gateway,
    btl.created_at
  FROM bank_transaction_ledger btl
  WHERE (_store_id IS NULL OR btl.id IN (
    SELECT p.id FROM payments p WHERE p.store_id = _store_id
  ))
  AND EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.id = btl.id 
    AND public.user_has_store_access(p.store_id)
  )
  ORDER BY btl.date DESC, btl.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (function will check roles internally)
GRANT EXECUTE ON FUNCTION public.get_bank_transactions(uuid) TO authenticated;

-- Add comment explaining the security model
COMMENT ON FUNCTION public.get_bank_transactions IS 
'Security definer function to access bank transaction ledger. Requires user to have financial management role (admin, manager, or accountant) and store access. Use this instead of querying bank_transaction_ledger view directly.';