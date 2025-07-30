-- Drop the existing search_items_enhanced function
DROP FUNCTION IF EXISTS public.search_items_enhanced(text, uuid, uuid, boolean, integer, integer);

-- Create a simplified search_items_enhanced function that only works with items table
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
SET search_path TO 'public'
AS $function$
DECLARE
  total_rows bigint;
BEGIN
  -- Get total count first
  SELECT COUNT(*) INTO total_rows
  FROM public.items i
  WHERE 
    (search_term IS NULL OR search_term = '' OR 
     i.name ILIKE '%' || search_term || '%')
    AND (store_id_filter IS NULL OR i.store_id = store_id_filter)
    AND (category_id_filter IS NULL OR i.category_id = category_id_filter)
    AND (NOT show_low_stock_only OR i.quantity_available < 10);

  -- Return paginated results
  RETURN QUERY
  SELECT 
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
  WHERE 
    (search_term IS NULL OR search_term = '' OR 
     i.name ILIKE '%' || search_term || '%')
    AND (store_id_filter IS NULL OR i.store_id = store_id_filter)
    AND (category_id_filter IS NULL OR i.category_id = category_id_filter)
    AND (NOT show_low_stock_only OR i.quantity_available < 10)
  ORDER BY i.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$function$;