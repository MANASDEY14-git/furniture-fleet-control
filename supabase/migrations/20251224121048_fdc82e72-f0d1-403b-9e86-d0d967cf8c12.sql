-- Create supplier_opening_balances table for store-specific opening balances
CREATE TABLE public.supplier_opening_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  opening_balance numeric NOT NULL DEFAULT 0,
  balance_type text NOT NULL DEFAULT 'debit' CHECK (balance_type IN ('debit', 'credit')),
  effective_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, store_id)
);

-- Enable RLS
ALTER TABLE public.supplier_opening_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for store access
CREATE POLICY "Users can access opening balances for their stores"
ON public.supplier_opening_balances
FOR ALL
USING (user_has_store_access(store_id));

-- Create trigger for updated_at
CREATE TRIGGER update_supplier_opening_balances_updated_at
  BEFORE UPDATE ON public.supplier_opening_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.supplier_opening_balances IS 'Stores opening balances for suppliers per store for mid-year accounting start';