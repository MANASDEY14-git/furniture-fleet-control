
-- 1. Create customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  gst_number text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Create customer_addresses table
CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  address text NOT NULL,
  phone text,
  contact_person text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Create customer_ledger table
CREATE TABLE public.customer_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('sale', 'payment', 'opening_balance', 'adjustment')),
  debit_amount numeric NOT NULL DEFAULT 0,
  credit_amount numeric NOT NULL DEFAULT 0,
  reference_type text,
  reference_id uuid,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Add customer_id to sales_orders (nullable, backward compatible)
ALTER TABLE public.sales_orders ADD COLUMN customer_id uuid REFERENCES public.customers(id);

-- 5. Enable RLS on all new tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for customers
CREATE POLICY "Users can access customers for their stores"
  ON public.customers FOR ALL
  USING (public.user_has_store_access(store_id))
  WITH CHECK (public.user_has_store_access(store_id));

-- 7. RLS policies for customer_addresses (through customer → store)
CREATE POLICY "Users can access customer addresses for their stores"
  ON public.customer_addresses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_addresses.customer_id
    AND public.user_has_store_access(c.store_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_addresses.customer_id
    AND public.user_has_store_access(c.store_id)
  ));

-- 8. RLS policies for customer_ledger
CREATE POLICY "Users can access customer ledger for their stores"
  ON public.customer_ledger FOR ALL
  USING (public.user_has_store_access(store_id))
  WITH CHECK (public.user_has_store_access(store_id));

-- 9. Indexes for performance
CREATE INDEX idx_customers_store_id ON public.customers(store_id);
CREATE INDEX idx_customers_name ON public.customers(name);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);
CREATE INDEX idx_customer_ledger_customer_id ON public.customer_ledger(customer_id);
CREATE INDEX idx_customer_ledger_store_id ON public.customer_ledger(store_id);
CREATE INDEX idx_sales_orders_customer_id ON public.sales_orders(customer_id);
