-- Phase 1: Add variant support to purchases table
ALTER TABLE public.purchases 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.item_variants(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_purchases_variant_id ON public.purchases(variant_id);

-- Update the purchase stock trigger to handle variants
CREATE OR REPLACE FUNCTION public.update_item_stock_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
  item_id_val uuid;
  variant_id_val uuid;
  unit_price_val numeric;
  quantity_val numeric;
BEGIN
  -- Direct item/variant purchase path (NEW APPROACH)
  IF NEW.item_id IS NOT NULL THEN
    -- Check if this purchase has a variant
    IF NEW.variant_id IS NOT NULL THEN
      -- Update variant stock
      UPDATE public.item_variants
      SET quantity_available = COALESCE(quantity_available, 0) + NEW.quantity,
          cost_price = CASE WHEN NEW.quantity > 0 THEN NEW.total_cost / NEW.quantity ELSE cost_price END,
          updated_at = now()
      WHERE id = NEW.variant_id;
    ELSE
      -- Update parent item stock
      UPDATE public.items
      SET quantity_available = COALESCE(quantity_available, 0) + NEW.quantity,
          cost_price = CASE WHEN NEW.quantity > 0 THEN NEW.total_cost / NEW.quantity ELSE cost_price END,
          last_restocked_date = NEW.date,
          updated_at = now()
      WHERE id = NEW.item_id;
    END IF;

  -- Legacy JSON array path (backward compatibility)
  ELSIF NEW.items IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      item_id_val := (item->>'item_id')::uuid;
      variant_id_val := (item->>'variant_id')::uuid;
      unit_price_val := (item->>'unit_price')::numeric;
      quantity_val := (item->>'quantity')::numeric;

      IF variant_id_val IS NOT NULL THEN
        -- Update variant stock
        UPDATE public.item_variants
        SET quantity_available = COALESCE(quantity_available, 0) + quantity_val,
            cost_price = unit_price_val,
            updated_at = now()
        WHERE id = variant_id_val;
      ELSE
        -- Update parent item stock
        UPDATE public.items
        SET quantity_available = COALESCE(quantity_available, 0) + quantity_val,
            cost_price = unit_price_val,
            last_restocked_date = NEW.date,
            updated_at = now()
        WHERE id = item_id_val;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';