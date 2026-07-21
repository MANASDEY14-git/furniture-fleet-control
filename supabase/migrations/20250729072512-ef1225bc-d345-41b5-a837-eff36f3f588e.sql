-- Fix the search_items_enhanced function and item_variants foreign key
-- The issue is that the search function might be causing schema conflicts

-- First, ensure proper foreign key constraint on item_variants
ALTER TABLE public.item_variants 
DROP CONSTRAINT IF EXISTS item_variants_item_id_fkey;

ALTER TABLE public.item_variants 
ADD CONSTRAINT item_variants_item_id_fkey 
FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

-- Fix the search function to avoid any schema path issues
CREATE OR REPLACE FUNCTION public.search_items_enhanced(
  search_term text DEFAULT NULL,
  store_id_filter uuid DEFAULT NULL,
  category_id_filter uuid DEFAULT NULL,
  show_low_stock_only boolean DEFAULT false,
  page_size integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  name text,
  category_id uuid,
  store_id uuid,
  quantity_available integer,
  cost_price numeric,
  selling_price numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  supplier_id uuid,
  stock_receive_date date,
  last_restocked_date date,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_rows bigint;
BEGIN
  -- Get total count first
  SELECT COUNT(DISTINCT i.id) INTO total_rows
  FROM public.items i
  LEFT JOIN public.item_variants iv ON i.id = iv.item_id
  LEFT JOIN public.item_variant_attributes iva ON iv.id = iva.variant_id
  LEFT JOIN public.attribute_values av ON iva.attribute_value_id = av.id
  WHERE 
    (search_term IS NULL OR search_term = '' OR 
     i.name ILIKE '%' || search_term || '%' OR 
     iv.sku ILIKE '%' || search_term || '%' OR 
     av.value ILIKE '%' || search_term || '%')
    AND (store_id_filter IS NULL OR i.store_id = store_id_filter)
    AND (category_id_filter IS NULL OR i.category_id = category_id_filter)
    AND (NOT show_low_stock_only OR i.quantity_available < 10);

  -- Return paginated results
  RETURN QUERY
  SELECT DISTINCT 
    i.id,
    i.name,
    i.category_id,
    i.store_id,
    i.quantity_available,
    i.cost_price,
    i.selling_price,
    i.created_at,
    i.updated_at,
    i.supplier_id,
    i.stock_receive_date,
    i.last_restocked_date,
    total_rows as total_count
  FROM public.items i
  LEFT JOIN public.item_variants iv ON i.id = iv.item_id
  LEFT JOIN public.item_variant_attributes iva ON iv.id = iva.variant_id
  LEFT JOIN public.attribute_values av ON iva.attribute_value_id = av.id
  WHERE 
    (search_term IS NULL OR search_term = '' OR 
     i.name ILIKE '%' || search_term || '%' OR 
     iv.sku ILIKE '%' || search_term || '%' OR 
     av.value ILIKE '%' || search_term || '%')
    AND (store_id_filter IS NULL OR i.store_id = store_id_filter)
    AND (category_id_filter IS NULL OR i.category_id = category_id_filter)
    AND (NOT show_low_stock_only OR i.quantity_available < 10)
  ORDER BY i.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Ensure proper RLS policies for item_variants with explicit schema references
DROP POLICY IF EXISTS "Allow authenticated users to manage item_variants" ON public.item_variants;
CREATE POLICY "Allow authenticated users to manage item_variants" 
ON public.item_variants FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.items 
    WHERE public.items.id = public.item_variants.item_id
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.items 
    WHERE public.items.id = public.item_variants.item_id
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.items TO authenticated;
GRANT ALL ON public.item_variants TO authenticated;