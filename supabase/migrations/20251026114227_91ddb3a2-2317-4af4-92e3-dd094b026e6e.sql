-- Fix search_items_enhanced function security by setting search_path
DROP FUNCTION IF EXISTS search_items_enhanced(text, uuid, uuid, uuid, boolean, integer, integer);

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
  total_quantity integer,
  has_variants boolean,
  total_count bigint
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
      i.updated_at,
      -- Calculate total quantity (item + all variants)
      (
        i.quantity_available + 
        COALESCE(
          (SELECT SUM(iv.quantity_available)::integer 
           FROM public.item_variants iv 
           WHERE iv.parent_item_id = i.id AND iv.is_active = true),
          0
        )
      ) as total_quantity,
      -- Check if item has variants
      EXISTS(
        SELECT 1 
        FROM public.item_variants iv 
        WHERE iv.parent_item_id = i.id AND iv.is_active = true
      ) as has_variants
    FROM public.items i
    WHERE 
      (search_term IS NULL OR search_term = '' OR i.name ILIKE '%' || search_term || '%')
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
    fi.total_quantity,
    fi.has_variants,
    t.count as total_count
  FROM filtered_items fi
  CROSS JOIN total t
  ORDER BY fi.created_at DESC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;