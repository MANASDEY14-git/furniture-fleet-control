-- Add supplier_id column to sales_order_items table
ALTER TABLE public.sales_order_items 
ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id);

-- Backfill existing data from items table
UPDATE public.sales_order_items soi
SET supplier_id = i.supplier_id
FROM public.items i
WHERE soi.item_id = i.id AND soi.supplier_id IS NULL;

-- Create index for efficient filtering
CREATE INDEX idx_sales_order_items_supplier_id ON public.sales_order_items(supplier_id);