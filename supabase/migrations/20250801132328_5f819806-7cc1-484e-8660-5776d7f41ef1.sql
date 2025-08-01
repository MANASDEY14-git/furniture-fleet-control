-- Create BOM tables
CREATE TABLE IF NOT EXISTS public.bom (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid REFERENCES public.items(id),
  name text,
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  version_notes text,
  estimated_cost numeric DEFAULT 0,
  last_cost_calculation timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.bom_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bom_id uuid REFERENCES public.bom(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id),
  quantity_required numeric NOT NULL,
  component_name text,
  is_customizable boolean DEFAULT false,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bom_component_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bom_component_id uuid REFERENCES public.bom_components(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materials(id),
  option_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_component_options ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can manage BOM" ON public.bom
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage BOM components" ON public.bom_components
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage BOM component options" ON public.bom_component_options
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Create triggers for cost calculation
CREATE TRIGGER update_bom_cost_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bom_components
  FOR EACH ROW EXECUTE FUNCTION public.update_bom_estimated_cost();