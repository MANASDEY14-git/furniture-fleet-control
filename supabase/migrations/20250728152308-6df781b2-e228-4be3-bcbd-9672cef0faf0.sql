-- Add default attribute values for existing attributes

-- Insert values for 'colour' attribute
INSERT INTO public.attribute_values (attribute_id, value) 
SELECT id, 'Red' FROM public.attributes WHERE name = 'colour' AND NOT EXISTS (
  SELECT 1 FROM public.attribute_values WHERE attribute_id = id AND value = 'Red'
);

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT id, 'Blue' FROM public.attributes WHERE name = 'colour' AND NOT EXISTS (
  SELECT 1 FROM public.attribute_values WHERE attribute_id = id AND value = 'Blue'
);

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT id, 'Green' FROM public.attributes WHERE name = 'colour' AND NOT EXISTS (
  SELECT 1 FROM public.attribute_values WHERE attribute_id = id AND value = 'Green'
);

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT id, 'Black' FROM public.attributes WHERE name = 'colour' AND NOT EXISTS (
  SELECT 1 FROM public.attribute_values WHERE attribute_id = id AND value = 'Black'
);

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT id, 'White' FROM public.attributes WHERE name = 'colour' AND NOT EXISTS (
  SELECT 1 FROM public.attribute_values WHERE attribute_id = id AND value = 'White'
);

-- Insert values for 'store' attribute (this seems like it should be 'size' instead)
-- Let's rename 'store' to 'Size' and add appropriate values
UPDATE public.attributes SET name = 'Size' WHERE name = 'store';

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT id, 'Small' FROM public.attributes WHERE name = 'Size' AND NOT EXISTS (
  SELECT 1 FROM public.attribute_values WHERE attribute_id = id AND value = 'Small'
);

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT id, 'Medium' FROM public.attributes WHERE name = 'Size' AND NOT EXISTS (
  SELECT 1 FROM public.attribute_values WHERE attribute_id = id AND value = 'Medium'
);

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT id, 'Large' FROM public.attributes WHERE name = 'Size' AND NOT EXISTS (
  SELECT 1 FROM public.attribute_values WHERE attribute_id = id AND value = 'Large'
);

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT id, 'Extra Large' FROM public.attributes WHERE name = 'Size' AND NOT EXISTS (
  SELECT 1 FROM public.attribute_values WHERE attribute_id = id AND value = 'Extra Large'
);