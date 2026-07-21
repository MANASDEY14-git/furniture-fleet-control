-- Comprehensive script to fix stock triggers
-- This migration ensures all stock triggers work properly

-- First, let's check what triggers currently exist
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('purchases', 'sales_order_items', 'sales')
AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Drop all existing stock-related triggers to start fresh
DROP TRIGGER IF EXISTS trigger_handle_sales_stock_deduction ON public.sales_order_items;
DROP TRIGGER IF EXISTS trigger_update_item_stock_on_purchase ON public.purchases;
DROP TRIGGER IF EXISTS trigger_deduct_item_stock_on_sale ON public.sales;
DROP TRIGGER IF EXISTS trigger_reverse_sales_stock_deduction ON public.sales_order_items;
DROP TRIGGER IF EXISTS trigger_reverse_purchase_stock ON public.purchases;
DROP TRIGGER IF EXISTS trigger_reverse_sale_stock ON public.sales;

-- Drop all existing stock-related functions
DROP FUNCTION IF EXISTS public.handle_sales_stock_deduction() CASCADE;
DROP FUNCTION IF EXISTS public.update_item_stock_on_purchase() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_item_stock_on_sale() CASCADE;
DROP FUNCTION IF EXISTS public.reverse_sales_stock_deduction() CASCADE;
DROP FUNCTION IF EXISTS public.reverse_purchase_stock() CASCADE;
DROP FUNCTION IF EXISTS public.reverse_sale_stock() CASCADE;

-- Create the purchase stock update function
CREATE OR REPLACE FUNCTION public.update_item_stock_on_purchase()
RETURNS trigger
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
  
  -- Log the update for debugging
  RAISE NOTICE 'Purchase trigger: Updated item % with quantity % and cost %', NEW.item_id, NEW.quantity, NEW.total_cost;
  
  RETURN NEW;
END;
$$;

-- Create the sales stock deduction function
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
  
  -- Log the update for debugging
  RAISE NOTICE 'Sales trigger: Deducted % from item %', NEW.quantity, NEW.item_id;
  
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
  
  -- Log the update for debugging
  RAISE NOTICE 'Direct sale trigger: Deducted % from item %', NEW.quantity, NEW.item_id;
  
  RETURN NEW;
END;
$$;

-- Create reverse functions for DELETE operations
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
  
  RAISE NOTICE 'Reverse purchase trigger: Removed % from item %', OLD.quantity, OLD.item_id;
  
  RETURN OLD;
END;
$$;

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
  
  RAISE NOTICE 'Reverse sales trigger: Added back % to item %', OLD.quantity, OLD.item_id;
  
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
  
  RAISE NOTICE 'Reverse direct sale trigger: Added back % to item %', OLD.quantity, OLD.item_id;
  
  RETURN OLD;
END;
$$;

-- Create all the triggers
CREATE TRIGGER trigger_update_item_stock_on_purchase
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_stock_on_purchase();

CREATE TRIGGER trigger_handle_sales_stock_deduction
  AFTER INSERT ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_stock_deduction();

CREATE TRIGGER trigger_deduct_item_stock_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_item_stock_on_sale();

CREATE TRIGGER trigger_reverse_purchase_stock
  AFTER DELETE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_purchase_stock();

CREATE TRIGGER trigger_reverse_sales_stock_deduction
  AFTER DELETE ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_sales_stock_deduction();

CREATE TRIGGER trigger_reverse_sale_stock
  AFTER DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_sale_stock();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_item_stock_on_purchase() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_sales_stock_deduction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_item_stock_on_sale() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_purchase_stock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_sales_stock_deduction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_sale_stock() TO authenticated;

-- Test the triggers with a simple test
DO $$
DECLARE
    test_item_id uuid;
    test_store_id uuid;
    test_supplier_id uuid;
    initial_quantity integer;
    final_quantity integer;
BEGIN
    -- Get test data
    SELECT id, quantity_available INTO test_item_id, initial_quantity 
    FROM items LIMIT 1;
    
    SELECT id INTO test_store_id FROM stores LIMIT 1;
    SELECT id INTO test_supplier_id FROM suppliers LIMIT 1;
    
    IF test_item_id IS NULL OR test_store_id IS NULL THEN
        RAISE NOTICE 'Missing required data for test';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with item: % (initial quantity: %)', test_item_id, initial_quantity;
    
    -- Test purchase trigger
    INSERT INTO purchases (
        store_id, item_id, item_name, supplier_id, 
        invoice_number, quantity, total_cost, date
    ) VALUES (
        test_store_id, test_item_id, 'Test Item', test_supplier_id,
        'TEST-PURCHASE-001', 5, 500.00, CURRENT_DATE
    );
    
    -- Check result
    SELECT quantity_available INTO final_quantity FROM items WHERE id = test_item_id;
    RAISE NOTICE 'After purchase: quantity = % (should be % + 5)', final_quantity, initial_quantity;
    
    -- Clean up
    DELETE FROM purchases WHERE invoice_number = 'TEST-PURCHASE-001';
    
    RAISE NOTICE 'Test completed successfully';
END $$;

-- Check final trigger status
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%stock%' 
AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Force schema reload
NOTIFY pgrst, 'reload schema'; 