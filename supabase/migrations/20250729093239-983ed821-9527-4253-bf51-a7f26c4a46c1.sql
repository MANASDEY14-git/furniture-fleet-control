-- Create custom functions to bypass PostgREST cache issues with item_variants

-- Function to create item variant directly
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
  -- Insert the variant
  INSERT INTO item_variants (item_id, sku, quantity_available, cost_price, selling_price)
  VALUES (p_item_id, p_sku, p_quantity_available, p_cost_price, p_selling_price)
  RETURNING id INTO v_variant_id;
  
  -- Insert variant attributes if provided
  IF array_length(p_attribute_value_ids, 1) > 0 THEN
    FOREACH v_attr_id IN ARRAY p_attribute_value_ids
    LOOP
      INSERT INTO item_variant_attributes (variant_id, attribute_value_id)
      VALUES (v_variant_id, v_attr_id);
    END LOOP;
  END IF;
  
  -- Return the created variant with all details
  SELECT to_jsonb(iv.*)
  INTO v_variant
  FROM item_variants iv
  WHERE iv.id = v_variant_id;
  
  RETURN v_variant;
END;
$$;

-- Function to update item variant directly
CREATE OR REPLACE FUNCTION public.update_item_variant_direct(
  p_variant_id uuid,
  p_sku text DEFAULT NULL,
  p_quantity_available integer DEFAULT NULL,
  p_cost_price numeric DEFAULT NULL,
  p_selling_price numeric DEFAULT NULL,
  p_attribute_value_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_variant jsonb;
  v_attr_id uuid;
BEGIN
  -- Update the variant (only update provided fields)
  UPDATE item_variants
  SET 
    sku = COALESCE(p_sku, sku),
    quantity_available = COALESCE(p_quantity_available, quantity_available),
    cost_price = COALESCE(p_cost_price, cost_price),
    selling_price = COALESCE(p_selling_price, selling_price),
    updated_at = now()
  WHERE id = p_variant_id;
  
  -- Update variant attributes if provided
  IF p_attribute_value_ids IS NOT NULL THEN
    -- Delete existing attributes
    DELETE FROM item_variant_attributes WHERE variant_id = p_variant_id;
    
    -- Insert new attributes
    IF array_length(p_attribute_value_ids, 1) > 0 THEN
      FOREACH v_attr_id IN ARRAY p_attribute_value_ids
      LOOP
        INSERT INTO item_variant_attributes (variant_id, attribute_value_id)
        VALUES (p_variant_id, v_attr_id);
      END LOOP;
    END IF;
  END IF;
  
  -- Return the updated variant
  SELECT to_jsonb(iv.*)
  INTO v_variant
  FROM item_variants iv
  WHERE iv.id = p_variant_id;
  
  RETURN v_variant;
END;
$$;

-- Function to delete item variant directly
CREATE OR REPLACE FUNCTION public.delete_item_variant_direct(p_variant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete variant attributes first
  DELETE FROM item_variant_attributes WHERE variant_id = p_variant_id;
  
  -- Delete the variant
  DELETE FROM item_variants WHERE id = p_variant_id;
  
  RETURN FOUND;
END;
$$;

-- Function to get item variants with attributes (bypassing table cache)
CREATE OR REPLACE FUNCTION public.get_item_variants_with_attributes(p_item_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', iv.id,
      'item_id', iv.item_id,
      'sku', iv.sku,
      'quantity_available', iv.quantity_available,
      'cost_price', iv.cost_price,
      'selling_price', iv.selling_price,
      'created_at', iv.created_at,
      'updated_at', iv.updated_at,
      'attributes', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'attribute_value_id', iva.attribute_value_id,
              'attribute_id', av.attribute_id,
              'value', av.value
            )
          )
          FROM item_variant_attributes iva
          LEFT JOIN attribute_values av ON av.id = iva.attribute_value_id
          WHERE iva.variant_id = iv.id
        ),
        '[]'::jsonb
      )
    )
  )
  INTO v_result
  FROM item_variants iv
  WHERE (p_item_id IS NULL OR iv.item_id = p_item_id);
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';