-- Add purchase trigger to update items table directly
-- This trigger will automatically update item quantities and costs when purchases are made

-- First, drop any existing purchase triggers
DROP TRIGGER IF EXISTS trigger_update_item_stock_on_purchase ON public.purchases;
DROP TRIGGER IF EXISTS update_item_stock_on_purchase_trigger ON public.purchases;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.update_item_stock_on_purchase() CASCADE;

-- Create the function to handle purchase stock updates
CREATE OR REPLACE FUNCTION public.update_item_stock_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the item's quantity and cost information
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
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_update_item_stock_on_purchase
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_stock_on_purchase();

-- Also create a trigger for when purchases are deleted (to reverse the stock)
CREATE OR REPLACE FUNCTION public.reverse_purchase_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reverse the stock update when a purchase is deleted
  UPDATE public.items
  SET 
    quantity_available = GREATEST(0, quantity_available - OLD.quantity),
    updated_at = now()
  WHERE id = OLD.item_id;
  
  RETURN OLD;
END;
$$;

-- Create the delete trigger
CREATE TRIGGER trigger_reverse_purchase_stock
  AFTER DELETE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_purchase_stock();

-- Create a trigger for purchase updates
CREATE OR REPLACE FUNCTION public.update_purchase_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle quantity changes when a purchase is updated
  IF OLD.quantity != NEW.quantity THEN
    -- Update the item's quantity based on the difference
    UPDATE public.items
    SET 
      quantity_available = quantity_available + (NEW.quantity - OLD.quantity),
      updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  
  -- Handle cost changes
  IF OLD.total_cost != NEW.total_cost OR OLD.quantity != NEW.quantity THEN
    -- Recalculate the cost price if needed
    UPDATE public.items
    SET 
      cost_price = CASE 
        WHEN quantity_available > 0 THEN
          ((quantity_available * cost_price) + (NEW.total_cost - COALESCE(OLD.total_cost, 0))) / quantity_available
        ELSE cost_price
      END,
      updated_at = now()
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the update trigger
CREATE TRIGGER trigger_update_purchase_stock
  AFTER UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_purchase_stock();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_item_stock_on_purchase() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_purchase_stock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_purchase_stock() TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
