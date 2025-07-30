-- Create items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID,
  store_id UUID,
  supplier_id UUID,
  quantity_available INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL,
  selling_price NUMERIC NOT NULL,
  stock_receive_date DATE,
  last_restocked_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for items
DROP POLICY IF EXISTS "Users can access items for their stores" ON public.items;
CREATE POLICY "Users can access items for their stores" 
ON public.items 
FOR ALL 
USING (user_has_store_access(store_id));

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_items_updated_at ON public.items;
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_store_id ON public.items(store_id);
CREATE INDEX IF NOT EXISTS idx_items_category_id ON public.items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_supplier_id ON public.items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);

-- Ensure item_variants table exists and has proper foreign key
CREATE TABLE IF NOT EXISTS public.item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  sku TEXT,
  quantity_available INTEGER DEFAULT 0,
  cost_price NUMERIC NOT NULL,
  selling_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on item_variants
ALTER TABLE public.item_variants ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for item_variants
DROP POLICY IF EXISTS "Allow all operations on item_variants" ON public.item_variants;
CREATE POLICY "Allow all operations on item_variants" 
ON public.item_variants 
FOR ALL 
USING (true);

-- Trigger for item_variants updated_at
DROP TRIGGER IF EXISTS update_item_variants_updated_at ON public.item_variants;
CREATE TRIGGER update_item_variants_updated_at
  BEFORE UPDATE ON public.item_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();