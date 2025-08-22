-- Clean up empty BOMs by deactivating them
UPDATE public.bom 
SET is_active = false 
WHERE id NOT IN (
  SELECT DISTINCT bom_id 
  FROM public.bom_components 
  WHERE bom_id IS NOT NULL
);

-- Clean up BOM components with invalid data
DELETE FROM public.bom_component_options 
WHERE bom_component_id NOT IN (
  SELECT id FROM public.bom_components
);

-- Clean up customizable components that have no options
UPDATE public.bom_components 
SET is_customizable = false 
WHERE is_customizable = true 
AND id NOT IN (
  SELECT DISTINCT bom_component_id 
  FROM public.bom_component_options 
  WHERE bom_component_id IS NOT NULL
);