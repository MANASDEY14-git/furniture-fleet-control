-- Sales Order Lifecycle Hardening
-- Additive only. No triggers changed. No UI changed.

-- 1. Update existing NULL status rows to 'confirmed'
UPDATE public.sales_orders SET status = 'confirmed' WHERE status IS NULL;

-- 2. Add document_type column
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'order';

-- 3. Add workflow_state column (nullable, future use)
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS workflow_state text;

-- 4. Add order-level stock_deducted safety column
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS stock_deducted boolean DEFAULT false;

-- 5. Add bom_processed column
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS bom_processed boolean DEFAULT false;

-- 6. Add indexes for future queries
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_document_type ON public.sales_orders(document_type);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(customer_id);
