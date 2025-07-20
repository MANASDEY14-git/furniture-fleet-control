-- Fix security issue: Remove SECURITY DEFINER from variant_details view
DROP VIEW IF EXISTS variant_details;

-- Recreate the view without SECURITY DEFINER
CREATE VIEW variant_details AS
SELECT 
  iv.*,
  i.name as item_name,
  i.category_id,
  STRING_AGG(av.value, ' / ' ORDER BY a.name) as variant_display_name
FROM item_variants iv
JOIN items i ON iv.item_id = i.id
LEFT JOIN item_variant_attributes iva ON iv.id = iva.variant_id
LEFT JOIN attribute_values av ON iva.attribute_value_id = av.id
LEFT JOIN attributes a ON av.attribute_id = a.id
GROUP BY iv.id, i.name, i.category_id;