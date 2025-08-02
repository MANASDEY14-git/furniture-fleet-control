-- Extend bom_components table to support different component types
-- This is safe and non-destructive - only adding new columns with defaults

ALTER TABLE public.bom_components 
ADD COLUMN IF NOT EXISTS component_type text NOT NULL DEFAULT 'material',
ADD COLUMN IF NOT EXISTS time_hours integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_cost numeric DEFAULT 0;

-- Add constraint for component types
ALTER TABLE public.bom_components 
ADD CONSTRAINT IF NOT EXISTS check_component_type 
CHECK (component_type IN ('material', 'labor', 'service'));

-- Create labor_categories table for standardized labor types
CREATE TABLE IF NOT EXISTS public.labor_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  default_hourly_rate numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on labor_categories
ALTER TABLE public.labor_categories ENABLE ROW LEVEL SECURITY;

-- Create policy for labor_categories
CREATE POLICY "Authenticated users can manage labor categories" ON public.labor_categories
FOR ALL USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- Add labor_category_id to bom_components for standardized labor types
ALTER TABLE public.bom_components 
ADD COLUMN IF NOT EXISTS labor_category_id uuid REFERENCES public.labor_categories(id);

-- Insert default labor categories
INSERT INTO public.labor_categories (name, description, default_hourly_rate) VALUES
('PU Finishing', 'Polyurethane finishing work', 500),
('Polishing', 'Wood polishing and refinishing', 300),
('Assembly', 'Product assembly and construction', 400),
('Quality Check', 'Final quality inspection', 250)
ON CONFLICT DO NOTHING;

-- Update the BOM cost calculation function to handle all component types
-- This preserves existing functionality while adding new capabilities
CREATE OR REPLACE FUNCTION public.update_bom_estimated_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Update the BOM's estimated cost when components change
  UPDATE bom 
  SET estimated_cost = (
    SELECT COALESCE(SUM(
      CASE 
        WHEN bc.component_type = 'material' THEN bc.quantity_required * COALESCE(m.cost_price, 0)
        WHEN bc.component_type = 'labor' THEN 
          (bc.time_hours + (bc.time_minutes::numeric / 60)) * COALESCE(bc.hourly_rate, lc.default_hourly_rate, 0)
        WHEN bc.component_type = 'service' THEN COALESCE(bc.service_cost, 0)
        ELSE 0
      END
    ), 0)
    FROM bom_components bc
    LEFT JOIN materials m ON m.id = bc.material_id AND bc.component_type = 'material'
    LEFT JOIN labor_categories lc ON lc.id = bc.labor_category_id AND bc.component_type = 'labor'
    WHERE bc.bom_id = COALESCE(NEW.bom_id, OLD.bom_id)
  ),
  last_cost_calculation = NOW()
  WHERE id = COALESCE(NEW.bom_id, OLD.bom_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;