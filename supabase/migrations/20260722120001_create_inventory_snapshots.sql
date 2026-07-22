-- Create inventory_snapshots table
CREATE TABLE IF NOT EXISTS public.inventory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity_available numeric NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  selling_price numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  age_days_avg numeric DEFAULT 0,
  slow_moving_value numeric DEFAULT 0,
  dead_stock_value numeric DEFAULT 0,
  fast_moving_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT inventory_snapshots_store_item_date_key UNIQUE (store_id, item_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can select inventory snapshots for accessible stores" ON public.inventory_snapshots;

-- Create policy for select
CREATE POLICY "Authenticated users can select inventory snapshots for accessible stores"
ON public.inventory_snapshots
FOR SELECT
TO authenticated
USING (
  store_id IS NULL OR
  EXISTS (
    SELECT 1 FROM public.user_store_access usa
    WHERE usa.user_id = auth.uid() AND usa.store_id = inventory_snapshots.store_id
  )
);

-- Grants
GRANT SELECT ON public.inventory_snapshots TO authenticated;
GRANT ALL ON public.inventory_snapshots TO service_role;

-- Index for querying historical snapshots by store and date
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_store_date ON public.inventory_snapshots(store_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_item_date ON public.inventory_snapshots(item_id, snapshot_date);
