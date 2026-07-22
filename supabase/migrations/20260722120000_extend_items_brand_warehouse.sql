-- Add brand and warehouse columns to items table if they don't exist
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS brand text DEFAULT NULL;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS warehouse text DEFAULT NULL;

-- Create indexes for performance when filtering by brand or warehouse
CREATE INDEX IF NOT EXISTS idx_items_brand ON public.items(brand);
CREATE INDEX IF NOT EXISTS idx_items_warehouse ON public.items(warehouse);
