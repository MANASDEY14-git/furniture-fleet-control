-- Enable Row Level Security for BOM tables
ALTER TABLE public.bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_component_options ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for BOM table
CREATE POLICY "Authenticated users can manage BOM" ON public.bom
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create RLS policies for BOM components table
CREATE POLICY "Authenticated users can manage BOM components" ON public.bom_components
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create RLS policies for BOM component options table
CREATE POLICY "Authenticated users can manage BOM component options" ON public.bom_component_options
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');