-- 1. Add avg_cost column to materials
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS avg_cost numeric DEFAULT 0;

-- Initialize avg_cost with current cost_price for existing records
UPDATE public.materials 
SET avg_cost = cost_price 
WHERE avg_cost = 0 OR avg_cost IS NULL;

-- 2. Create material_consumptions table
CREATE TABLE IF NOT EXISTS public.material_consumptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id),
  quantity_used numeric NOT NULL CHECK (quantity_used > 0),
  reference_type text NOT NULL DEFAULT 'manual' CHECK (reference_type IN ('order', 'job', 'manual', 'production')),
  reference_id uuid,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

-- Enable RLS on material_consumptions
ALTER TABLE public.material_consumptions ENABLE ROW LEVEL SECURITY;

-- RLS policy for material_consumptions
CREATE POLICY "Users can manage material consumptions for their stores"
  ON public.material_consumptions
  FOR ALL
  USING (user_has_store_access(store_id));

-- 3. Create or replace trigger function for weighted average cost on purchase
CREATE OR REPLACE FUNCTION public.update_material_stock_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
  old_qty numeric;
  old_avg_cost numeric;
  new_avg_cost numeric;
BEGIN
  -- Get current quantity and avg_cost
  SELECT quantity_available, COALESCE(avg_cost, cost_price, 0) 
  INTO old_qty, old_avg_cost
  FROM public.materials 
  WHERE id = NEW.material_id;

  -- Calculate weighted average cost
  IF (old_qty + NEW.quantity) > 0 THEN
    new_avg_cost := ((COALESCE(old_qty, 0) * COALESCE(old_avg_cost, 0)) + (NEW.quantity * NEW.unit_cost)) / (COALESCE(old_qty, 0) + NEW.quantity);
  ELSE
    new_avg_cost := NEW.unit_cost;
  END IF;

  -- Update material: increase stock, set avg_cost, keep cost_price as last purchase price
  UPDATE public.materials
  SET 
    quantity_available = COALESCE(quantity_available, 0) + NEW.quantity,
    cost_price = NEW.unit_cost,
    avg_cost = new_avg_cost,
    updated_at = now()
  WHERE id = NEW.material_id;

  -- Create stock movement record
  INSERT INTO public.material_stock_movements (
    material_id,
    movement_type,
    quantity_change,
    reference_type,
    reference_id,
    notes
  ) VALUES (
    NEW.material_id,
    'purchase',
    NEW.quantity,
    'material_purchase',
    NEW.id,
    'Purchase - Invoice: ' || COALESCE(NEW.invoice_number, 'N/A')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create trigger function for material consumption
CREATE OR REPLACE FUNCTION public.process_material_consumption()
RETURNS TRIGGER AS $$
DECLARE
  current_qty numeric;
  material_name text;
BEGIN
  -- Get current quantity and material name
  SELECT quantity_available, name 
  INTO current_qty, material_name
  FROM public.materials 
  WHERE id = NEW.material_id;

  -- Prevent negative stock
  IF (COALESCE(current_qty, 0) - NEW.quantity_used) < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for material "%". Available: %, Requested: %', 
      material_name, COALESCE(current_qty, 0), NEW.quantity_used;
  END IF;

  -- Decrease material stock
  UPDATE public.materials
  SET 
    quantity_available = quantity_available - NEW.quantity_used,
    updated_at = now()
  WHERE id = NEW.material_id;

  -- Create stock movement record
  INSERT INTO public.material_stock_movements (
    material_id,
    movement_type,
    quantity_change,
    reference_type,
    reference_id,
    notes
  ) VALUES (
    NEW.material_id,
    'consumption',
    -NEW.quantity_used,
    NEW.reference_type,
    COALESCE(NEW.reference_id, NEW.id),
    COALESCE(NEW.notes, 'Material consumed')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create consumption trigger
DROP TRIGGER IF EXISTS process_material_consumption_trigger ON public.material_consumptions;
CREATE TRIGGER process_material_consumption_trigger
  AFTER INSERT ON public.material_consumptions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_material_consumption();

-- 5. Add constraint to prevent negative stock on materials
ALTER TABLE public.materials 
DROP CONSTRAINT IF EXISTS materials_quantity_non_negative;

ALTER TABLE public.materials 
ADD CONSTRAINT materials_quantity_non_negative 
CHECK (quantity_available >= 0);

-- 6. Create function for manual stock adjustments
CREATE OR REPLACE FUNCTION public.adjust_material_stock(
  p_material_id uuid,
  p_quantity_change numeric,
  p_adjustment_type text,
  p_notes text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_qty numeric;
  material_name text;
BEGIN
  -- Get current quantity
  SELECT quantity_available, name 
  INTO current_qty, material_name
  FROM public.materials 
  WHERE id = p_material_id;

  -- Check for negative result
  IF (COALESCE(current_qty, 0) + p_quantity_change) < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative stock for material "%". Current: %, Change: %', 
      material_name, COALESCE(current_qty, 0), p_quantity_change;
  END IF;

  -- Update material stock
  UPDATE public.materials
  SET 
    quantity_available = quantity_available + p_quantity_change,
    updated_at = now()
  WHERE id = p_material_id;

  -- Log the movement
  INSERT INTO public.material_stock_movements (
    material_id,
    movement_type,
    quantity_change,
    reference_type,
    notes
  ) VALUES (
    p_material_id,
    p_adjustment_type,
    p_quantity_change,
    'manual_adjustment',
    COALESCE(p_notes, 'Stock adjustment: ' || p_adjustment_type)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;