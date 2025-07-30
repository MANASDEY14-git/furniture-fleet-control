-- Let's check and fix the foreign key relationships and ensure all tables work together properly

-- Add missing foreign key constraints if they don't exist
DO $$
BEGIN
    -- Check if foreign key from item_variants to items exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'item_variants_item_id_fkey' 
        AND table_name = 'item_variants'
    ) THEN
        ALTER TABLE public.item_variants 
        ADD CONSTRAINT item_variants_item_id_fkey 
        FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    END IF;

    -- Check if foreign key from item_variant_attributes to item_variants exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'item_variant_attributes_variant_id_fkey' 
        AND table_name = 'item_variant_attributes'
    ) THEN
        ALTER TABLE public.item_variant_attributes 
        ADD CONSTRAINT item_variant_attributes_variant_id_fkey 
        FOREIGN KEY (variant_id) REFERENCES public.item_variants(id) ON DELETE CASCADE;
    END IF;

    -- Check if foreign key from item_variant_attributes to attribute_values exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'item_variant_attributes_attribute_value_id_fkey' 
        AND table_name = 'item_variant_attributes'
    ) THEN
        ALTER TABLE public.item_variant_attributes 
        ADD CONSTRAINT item_variant_attributes_attribute_value_id_fkey 
        FOREIGN KEY (attribute_value_id) REFERENCES public.attribute_values(id) ON DELETE CASCADE;
    END IF;

    -- Check if foreign key from attribute_values to attributes exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attribute_values_attribute_id_fkey' 
        AND table_name = 'attribute_values'
    ) THEN
        ALTER TABLE public.attribute_values 
        ADD CONSTRAINT attribute_values_attribute_id_fkey 
        FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure all necessary policies exist
DROP POLICY IF EXISTS "Allow all operations on attributes" ON public.attributes;
CREATE POLICY "Allow all operations on attributes" 
ON public.attributes 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on attribute_values" ON public.attribute_values;
CREATE POLICY "Allow all operations on attribute_values" 
ON public.attribute_values 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on item_variant_attributes" ON public.item_variant_attributes;
CREATE POLICY "Allow all operations on item_variant_attributes" 
ON public.item_variant_attributes 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Add some default attributes and values if they don't exist
INSERT INTO public.attributes (name) 
SELECT 'Size' WHERE NOT EXISTS (SELECT 1 FROM public.attributes WHERE name = 'Size');

INSERT INTO public.attributes (name) 
SELECT 'Color' WHERE NOT EXISTS (SELECT 1 FROM public.attributes WHERE name = 'Color');

-- Add some default attribute values
INSERT INTO public.attribute_values (attribute_id, value) 
SELECT a.id, 'Small' 
FROM public.attributes a 
WHERE a.name = 'Size' 
AND NOT EXISTS (SELECT 1 FROM public.attribute_values av WHERE av.attribute_id = a.id AND av.value = 'Small');

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT a.id, 'Medium' 
FROM public.attributes a 
WHERE a.name = 'Size' 
AND NOT EXISTS (SELECT 1 FROM public.attribute_values av WHERE av.attribute_id = a.id AND av.value = 'Medium');

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT a.id, 'Large' 
FROM public.attributes a 
WHERE a.name = 'Size' 
AND NOT EXISTS (SELECT 1 FROM public.attribute_values av WHERE av.attribute_id = a.id AND av.value = 'Large');

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT a.id, 'Red' 
FROM public.attributes a 
WHERE a.name = 'Color' 
AND NOT EXISTS (SELECT 1 FROM public.attribute_values av WHERE av.attribute_id = a.id AND av.value = 'Red');

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT a.id, 'Blue' 
FROM public.attributes a 
WHERE a.name = 'Color' 
AND NOT EXISTS (SELECT 1 FROM public.attribute_values av WHERE av.attribute_id = a.id AND av.value = 'Blue');

INSERT INTO public.attribute_values (attribute_id, value) 
SELECT a.id, 'Green' 
FROM public.attributes a 
WHERE a.name = 'Color' 
AND NOT EXISTS (SELECT 1 FROM public.attribute_values av WHERE av.attribute_id = a.id AND av.value = 'Green');