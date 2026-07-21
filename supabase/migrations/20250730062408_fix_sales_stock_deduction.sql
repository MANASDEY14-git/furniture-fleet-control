-- Fix sales stock deduction triggers to work properly with items table
-- The issue is that the trigger is on sales_orders but should be on sales_order_items
-- Also need to fix the purchase trigger to work without the items JSON field

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_handle_sales_stock_deduction ON public.sales_orders;
DROP TRIGGER IF EXISTS trigger_update_item_stock_on_purchase ON public.purchases;
DROP TRIGGER IF EXISTS trigger_deduct_item_stock_on_sale ON public.sales;

-- Drop the functions
DROP FUNCTION IF EXISTS public.handle_sales_stock_deduction() CASCADE;
DROP FUNCTION IF EXISTS public.update_item_stock_on_purchase() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_item_stock_on_sale() CASCADE;

-- Create the correct sales stock deduction function
-- This should trigger on sales_order_items, not sales_orders
CREATE OR REPLACE FUNCTION public.handle_sales_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deduct stock from the item when a sales order item is created
  UPDATE public.items
  SET 
    quantity_available = GREATEST(0, quantity_available - NEW.quantity),
    updated_at = now()
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$;

-- Create the correct purchase stock update function
-- This should work directly with the purchase record, not a JSON field
CREATE OR REPLACE FUNCTION public.update_item_stock_on_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the item's quantity and cost information directly from purchase record
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

-- Create the direct sales stock deduction function
CREATE OR REPLACE FUNCTION public.deduct_item_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deduct stock from the item when a direct sale is created
  UPDATE public.items
  SET 
    quantity_available = GREATEST(0, quantity_available - NEW.quantity),
    updated_at = now()
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$;

-- Create the correct triggers
-- Sales order items trigger (this is the main one for sales orders)
CREATE TRIGGER trigger_handle_sales_stock_deduction
  AFTER INSERT ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_stock_deduction();

-- Purchase trigger
CREATE TRIGGER trigger_update_item_stock_on_purchase
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_stock_on_purchase();

-- Direct sales trigger
CREATE TRIGGER trigger_deduct_item_stock_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_item_stock_on_sale();

-- Also create triggers for DELETE operations to reverse stock changes
CREATE OR REPLACE FUNCTION public.reverse_sales_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add back stock when a sales order item is deleted
  UPDATE public.items
  SET 
    quantity_available = quantity_available + OLD.quantity,
    updated_at = now()
  WHERE id = OLD.item_id;
  
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_purchase_stock()
RETURNS trigger
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
  
  RETURN OLD;
END;
$$;

-- Create DELETE triggers
CREATE TRIGGER trigger_reverse_sales_stock_deduction
  AFTER DELETE ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_sales_stock_deduction();

CREATE TRIGGER trigger_reverse_purchase_stock
  AFTER DELETE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_purchase_stock();

CREATE TRIGGER trigger_reverse_sale_stock
  AFTER DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_sale_stock();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_sales_stock_deduction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_item_stock_on_purchase() TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_item_stock_on_sale() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_sales_stock_deduction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_purchase_stock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_sale_stock() TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
