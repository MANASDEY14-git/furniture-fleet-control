-- Emergency fix: Recreate function with fully qualified table names and force PostgREST restart

-- Drop and recreate the create function with explicit schema references
DROP FUNCTION IF EXISTS public.create_item_variant_direct(uuid, text, integer, numeric, numeric, uuid[]);

CREATE OR REPLACE FUNCTION public.create_item_variant_direct(
  p_item_id uuid,
  p_sku text,
  p_quantity_available integer,
  p_cost_price numeric,
  p_selling_price numeric,
  p_attribute_value_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_variant_id uuid;
  v_variant jsonb;
  v_attr_id uuid;
BEGIN
  -- Explicitly use schema-qualified table names
  INSERT INTO public.item_variants (item_id, sku, quantity_available, cost_price, selling_price)
  VALUES (p_item_id, p_sku, p_quantity_available, p_cost_price, p_selling_price)
  RETURNING id INTO v_variant_id;
  
  -- Insert variant attributes if provided
  IF array_length(p_attribute_value_ids, 1) > 0 THEN
    FOREACH v_attr_id IN ARRAY p_attribute_value_ids
    LOOP
      INSERT INTO public.item_variant_attributes (variant_id, attribute_value_id)
      VALUES (v_variant_id, v_attr_id);
    END LOOP;
  END IF;
  
  -- Return the created variant with all details
  SELECT to_jsonb(iv.*)
  INTO v_variant
  FROM public.item_variants iv
  WHERE iv.id = v_variant_id;
  
  RETURN v_variant;
END;
$$;

-- Force multiple schema reload attempts
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Update a comment to force table recognition
COMMENT ON TABLE public.items IS 'Items table - forced refresh at 2025-07-29';
COMMENT ON TABLE public.item_variants IS 'Item variants table - forced refresh at 2025-07-29';

-- Refresh statistics to help PostgREST recognize tables
ANALYZE public.items;
ANALYZE public.item_variants;
ANALYZE public.item_variant_attributes;

-- One more schema reload
NOTIFY pgrst, 'reload schema';