-- Add missing foreign key constraint between attribute_values and attributes
ALTER TABLE public.attribute_values 
ADD CONSTRAINT attribute_values_attribute_id_fkey 
FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;