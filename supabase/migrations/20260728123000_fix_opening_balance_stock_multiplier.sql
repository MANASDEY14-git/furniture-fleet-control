-- Migration: Fix opening balance stock multiplier bug
-- Description: Modifies apply_stock_adjustment() trigger function to skip updating live items/variants stock for 'opening_balance' adjustments.

CREATE OR REPLACE FUNCTION public.apply_stock_adjustment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip updating live stock if the adjustment is an opening balance
  IF NEW.adjustment_type = 'opening_balance' THEN
    RETURN NEW;
  END IF;

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
$function$;
