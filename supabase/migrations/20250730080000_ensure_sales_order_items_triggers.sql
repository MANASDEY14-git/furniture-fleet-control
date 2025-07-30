-- Migration: Ensure sales_order_items triggers update items table for stock deduction

-- Drop existing triggers and functions if any
DROP TRIGGER IF EXISTS trigger_handle_sales_stock_deduction ON public.sales_order_items;
DROP TRIGGER IF EXISTS trigger_reverse_sales_stock_deduction ON public.sales_order_items;
DROP FUNCTION IF EXISTS public.handle_sales_stock_deduction() CASCADE;
DROP FUNCTION IF EXISTS public.reverse_sales_stock_deduction() CASCADE;

-- Create the stock deduction function for sales_order_items
CREATE OR REPLACE FUNCTION public.handle_sales_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_quantity integer;
    new_quantity integer;
    item_exists boolean;
BEGIN
  -- Check if the item exists
  SELECT EXISTS(SELECT 1 FROM public.items WHERE id = NEW.item_id) INTO item_exists;
  IF NOT item_exists THEN
    RAISE NOTICE 'Sales trigger: Item % does not exist', NEW.item_id;
    RETURN NEW;
  END IF;
  -- Get current item quantity
  SELECT quantity_available INTO item_quantity FROM public.items WHERE id = NEW.item_id;
  -- Calculate new quantity
  new_quantity := GREATEST(0, item_quantity - NEW.quantity);
  -- Update the item's quantity
  UPDATE public.items
  SET quantity_available = new_quantity, updated_at = now()
  WHERE id = NEW.item_id;
  -- Log the update for debugging
  RAISE NOTICE 'Sales trigger: Item % - Old quantity: %, Deducted: %, New quantity: %', NEW.item_id, item_quantity, NEW.quantity, new_quantity;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Sales trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the reverse function for DELETE
CREATE OR REPLACE FUNCTION public.reverse_sales_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_quantity integer;
    new_quantity integer;
    item_exists boolean;
BEGIN
  -- Check if the item exists
  SELECT EXISTS(SELECT 1 FROM public.items WHERE id = OLD.item_id) INTO item_exists;
  IF NOT item_exists THEN
    RAISE NOTICE 'Reverse sales trigger: Item % does not exist', OLD.item_id;
    RETURN OLD;
  END IF;
  -- Get current item quantity
  SELECT quantity_available INTO item_quantity FROM public.items WHERE id = OLD.item_id;
  -- Calculate new quantity
  new_quantity := item_quantity + OLD.quantity;
  -- Update the item's quantity
  UPDATE public.items
  SET quantity_available = new_quantity, updated_at = now()
  WHERE id = OLD.item_id;
  -- Log the update for debugging
  RAISE NOTICE 'Reverse sales trigger: Item % - Old quantity: %, Added back: %, New quantity: %', OLD.item_id, item_quantity, OLD.quantity, new_quantity;
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Reverse sales trigger error: %', SQLERRM;
    RETURN OLD;
END;
$$;

-- Create the triggers
CREATE TRIGGER trigger_handle_sales_stock_deduction
  AFTER INSERT ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_stock_deduction();

CREATE TRIGGER trigger_reverse_sales_stock_deduction
  AFTER DELETE ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_sales_stock_deduction();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_sales_stock_deduction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_sales_stock_deduction() TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema'; 