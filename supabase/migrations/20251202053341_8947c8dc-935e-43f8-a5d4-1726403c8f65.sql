-- Create stock_adjustments table for manual inventory adjustments
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.item_variants(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('damaged', 'theft', 'physical_count', 'other')),
  quantity_change INTEGER NOT NULL,
  reason TEXT,
  notes TEXT,
  adjusted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on stock_adjustments
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can manage adjustments for their stores
CREATE POLICY "Users can manage stock adjustments for their stores"
  ON public.stock_adjustments
  FOR ALL
  USING (user_has_store_access(store_id));

-- Trigger to update item/variant stock when adjustment is created
CREATE OR REPLACE FUNCTION public.apply_stock_adjustment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update variant stock if variant_id is specified
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE public.item_variants
    SET quantity_available = quantity_available + NEW.quantity_change,
        updated_at = NOW()
    WHERE id = NEW.variant_id;
  -- Otherwise update parent item stock
  ELSIF NEW.item_id IS NOT NULL THEN
    UPDATE public.items
    SET quantity_available = quantity_available + NEW.quantity_change,
        updated_at = NOW()
    WHERE id = NEW.item_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for stock adjustments
CREATE TRIGGER trigger_apply_stock_adjustment
  AFTER INSERT ON public.stock_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_stock_adjustment();

-- Add index for performance
CREATE INDEX idx_stock_adjustments_item_id ON public.stock_adjustments(item_id);
CREATE INDEX idx_stock_adjustments_store_id ON public.stock_adjustments(store_id);
CREATE INDEX idx_stock_adjustments_created_at ON public.stock_adjustments(created_at);