-- Add missing foreign key constraints

-- Add foreign key from item_variants to items
ALTER TABLE public.item_variants 
ADD CONSTRAINT fk_item_variants_item_id 
FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;

-- Add foreign key from item_variant_attributes to item_variants
ALTER TABLE public.item_variant_attributes 
ADD CONSTRAINT fk_item_variant_attributes_variant_id 
FOREIGN KEY (variant_id) REFERENCES public.item_variants(id) ON DELETE CASCADE;

-- Add foreign key from item_variant_attributes to attribute_values
ALTER TABLE public.item_variant_attributes 
ADD CONSTRAINT fk_item_variant_attributes_attribute_value_id 
FOREIGN KEY (attribute_value_id) REFERENCES public.attribute_values(id) ON DELETE CASCADE;

-- Add foreign key from attribute_values to attributes
ALTER TABLE public.attribute_values 
ADD CONSTRAINT fk_attribute_values_attribute_id 
FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;