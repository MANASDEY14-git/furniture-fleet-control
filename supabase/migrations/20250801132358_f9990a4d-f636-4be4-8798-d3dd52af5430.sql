-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can manage BOM" ON public.bom;
DROP POLICY IF EXISTS "Authenticated users can manage BOM components" ON public.bom_components;
DROP POLICY IF EXISTS "Authenticated users can manage BOM component options" ON public.bom_component_options;

-- Create new RLS policies
CREATE POLICY "Authenticated users can manage BOM" ON public.bom
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage BOM components" ON public.bom_components
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage BOM component options" ON public.bom_component_options
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');