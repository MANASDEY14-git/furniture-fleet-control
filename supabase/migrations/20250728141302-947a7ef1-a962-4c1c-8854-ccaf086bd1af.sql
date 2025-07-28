-- Create a function for enhanced item search that includes variants and attributes
CREATE OR REPLACE FUNCTION public.search_items_enhanced(
  search_term text,
  store_id_filter uuid DEFAULT NULL,
  category_id_filter uuid DEFAULT NULL,
  show_low_stock_only boolean DEFAULT false,
  page_size integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  category_id uuid,
  store_id uuid,
  quantity_available integer,
  cost_price numeric,
  selling_price numeric,
  created_at timestamptz,
  updated_at timestamptz,
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
  -- First get the total count
  SELECT COUNT(DISTINCT i.id) INTO total_rows
  FROM items i
  LEFT JOIN item_variants iv ON i.id = iv.item_id
  LEFT JOIN item_variant_attributes iva ON iv.id = iva.variant_id
  LEFT JOIN attribute_values av ON iva.attribute_value_id = av.id
  WHERE 
    (search_term IS NULL OR search_term = '' OR 
     i.name ILIKE '%' || search_term || '%' OR 
     iv.sku ILIKE '%' || search_term || '%' OR 
     av.value ILIKE '%' || search_term || '%')
    AND (store_id_filter IS NULL OR i.store_id = store_id_filter)
    AND (category_id_filter IS NULL OR i.category_id = category_id_filter)
    AND (NOT show_low_stock_only OR i.quantity_available < 10);

  -- Return the paginated results with total count
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
  FROM items i
  LEFT JOIN item_variants iv ON i.id = iv.item_id
  LEFT JOIN item_variant_attributes iva ON iv.id = iva.variant_id
  LEFT JOIN attribute_values av ON iva.attribute_value_id = av.id
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