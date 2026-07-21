-- Drop the existing function
DROP FUNCTION IF EXISTS search_items_enhanced(text, uuid, uuid, boolean, integer, integer);

-- Create updated function with supplier filter
CREATE OR REPLACE FUNCTION search_items_enhanced(
  search_term text DEFAULT NULL,
  store_id_filter uuid DEFAULT NULL,
  category_id_filter uuid DEFAULT NULL,
  supplier_id_filter uuid DEFAULT NULL,
  show_low_stock_only boolean DEFAULT false,
  page_size integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  quantity_available integer,
  cost_price numeric,
  selling_price numeric,
  store_id uuid,
  category_id uuid,
  supplier_id uuid,
  stock_receive_date date,
  last_restocked_date date,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_items AS (
    SELECT 
      i.id,
      i.name,
      i.quantity_available,
      i.cost_price,
      i.selling_price,
      i.store_id,
      i.category_id,
      i.supplier_id,
      i.stock_receive_date,
      i.last_restocked_date,
      i.created_at,
      i.updated_at
    FROM items i
    WHERE 
      (search_term IS NULL OR i.name ILIKE '%' || search_term || '%')
      AND (store_id_filter IS NULL OR i.store_id = store_id_filter)
      AND (category_id_filter IS NULL OR i.category_id = category_id_filter)
      AND (supplier_id_filter IS NULL OR i.supplier_id = supplier_id_filter)
      AND (NOT show_low_stock_only OR i.quantity_available < 5)
  ),
  total AS (
    SELECT COUNT(*) as count FROM filtered_items
  )
  SELECT 
    fi.id,
    fi.name,
    fi.quantity_available,
    fi.cost_price,
    fi.selling_price,
    fi.store_id,
    fi.category_id,
    fi.supplier_id,
    fi.stock_receive_date,
    fi.last_restocked_date,
    fi.created_at,
    fi.updated_at,
    t.count as total_count
  FROM filtered_items fi
  CROSS JOIN total t
  ORDER BY fi.name
  LIMIT page_size
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;