-- Migration to add variant support back to stock triggers

CREATE OR REPLACE FUNCTION public.update_item_stock_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the parent item's quantity and cost information
  UPDATE public.items
  SET 
    quantity_available = quantity_available + NEW.quantity,
    cost_price = CASE 
      WHEN quantity_available + NEW.quantity > 0 THEN
        ((quantity_available * cost_price) + NEW.total_cost) / (quantity_available + NEW.quantity)
      ELSE NEW.total_cost / NEW.quantity
    END,
    last_restocked_date = NEW.date,
    updated_at = now()
  WHERE id = NEW.item_id;
  
  -- If a variant is specified, update the variant's quantity and cost
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE public.item_variants
    SET
      quantity_available = quantity_available + NEW.quantity,
      cost_price = CASE 
        WHEN quantity_available + NEW.quantity > 0 THEN
          ((quantity_available * cost_price) + NEW.total_cost) / (quantity_available + NEW.quantity)
        ELSE NEW.total_cost / NEW.quantity
      END,
      updated_at = now()
    WHERE id = NEW.variant_id;
  END IF;
  
  -- Log the update for debugging
  RAISE NOTICE 'Purchase trigger: Updated item % (variant %) with quantity % and cost %', NEW.item_id, NEW.variant_id, NEW.quantity, NEW.total_cost;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_sales_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deduct stock from the parent item
  UPDATE public.items
  SET 
    quantity_available = GREATEST(0, quantity_available - NEW.quantity),
    updated_at = now()
  WHERE id = NEW.item_id;
  
  -- If a variant is specified, deduct from the variant
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE public.item_variants
    SET
      quantity_available = GREATEST(0, quantity_available - NEW.quantity),
      updated_at = now()
    WHERE id = NEW.variant_id;
  END IF;
  
  -- Log the update for debugging
  RAISE NOTICE 'Sales trigger: Deducted % from item % (variant %)', NEW.quantity, NEW.item_id, NEW.variant_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_purchase_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reverse the stock update on parent item
  UPDATE public.items
  SET 
    quantity_available = GREATEST(0, quantity_available - OLD.quantity),
    updated_at = now()
  WHERE id = OLD.item_id;
  
  -- Reverse on variant if specified
  IF OLD.variant_id IS NOT NULL THEN
    UPDATE public.item_variants
    SET
      quantity_available = GREATEST(0, quantity_available - OLD.quantity),
      updated_at = now()
    WHERE id = OLD.variant_id;
  END IF;
  
  RAISE NOTICE 'Reverse purchase trigger: Removed % from item % (variant %)', OLD.quantity, OLD.item_id, OLD.variant_id;
  
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_sales_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add back stock to parent item
  UPDATE public.items
  SET 
    quantity_available = quantity_available + OLD.quantity,
    updated_at = now()
  WHERE id = OLD.item_id;
  
  -- Add back stock to variant
  IF OLD.variant_id IS NOT NULL THEN
    UPDATE public.item_variants
    SET
      quantity_available = quantity_available + OLD.quantity,
      updated_at = now()
    WHERE id = OLD.variant_id;
  END IF;
  
  RAISE NOTICE 'Reverse sales trigger: Added back % to item % (variant %)', OLD.quantity, OLD.item_id, OLD.variant_id;
  
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_item_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deduct stock from the parent item
  UPDATE public.items
  SET 
    quantity_available = GREATEST(0, quantity_available - NEW.quantity),
    updated_at = now()
  WHERE id = NEW.item_id;
  
  -- Log the update for debugging
  RAISE NOTICE 'Direct sale trigger: Deducted % from item %', NEW.quantity, NEW.item_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_sale_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add back stock when a direct sale is deleted
  UPDATE public.items
  SET 
    quantity_available = quantity_available + OLD.quantity,
    updated_at = now()
  WHERE id = OLD.item_id;
  
  RAISE NOTICE 'Reverse direct sale trigger: Added back % to item %', OLD.quantity, OLD.item_id;
  
  RETURN OLD;
END;
$$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
