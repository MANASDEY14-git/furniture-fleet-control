-- Debug and fix sales trigger issue
-- Run this in your Supabase SQL Editor

-- First, let's check what triggers currently exist
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('sales_order_items', 'sales')
AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Check if the sales trigger function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%sales%' OR routine_name LIKE '%stock%'
AND routine_schema = 'public'
ORDER BY routine_name;

-- Let's check the sales_order_items table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales_order_items'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any sales_order_items records
SELECT COUNT(*) as total_sales_order_items FROM sales_order_items;

-- Check if there are any sales records
SELECT COUNT(*) as total_sales FROM sales;

-- Let's drop and recreate the sales triggers specifically
DROP TRIGGER IF EXISTS trigger_handle_sales_stock_deduction ON public.sales_order_items;
DROP TRIGGER IF EXISTS trigger_deduct_item_stock_on_sale ON public.sales;
DROP FUNCTION IF EXISTS public.handle_sales_stock_deduction() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_item_stock_on_sale() CASCADE;

-- Create the sales stock deduction function with better debugging
CREATE OR REPLACE FUNCTION public.handle_sales_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_quantity integer;
    new_quantity integer;
BEGIN
  -- Get current item quantity
  SELECT quantity_available INTO item_quantity 
  FROM public.items 
  WHERE id = NEW.item_id;
  
  -- Calculate new quantity
  new_quantity := GREATEST(0, item_quantity - NEW.quantity);
  
  -- Update the item's quantity
  UPDATE public.items
  SET 
    quantity_available = new_quantity,
    updated_at = now()
  WHERE id = NEW.item_id;
  
  -- Log the update for debugging
  RAISE NOTICE 'Sales trigger: Item % - Old quantity: %, Deducted: %, New quantity: %', 
    NEW.item_id, item_quantity, NEW.quantity, new_quantity;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Sales trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the direct sales stock deduction function with better debugging
CREATE OR REPLACE FUNCTION public.deduct_item_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item_quantity integer;
    new_quantity integer;
BEGIN
  -- Get current item quantity
  SELECT quantity_available INTO item_quantity 
  FROM public.items 
  WHERE id = NEW.item_id;
  
  -- Calculate new quantity
  new_quantity := GREATEST(0, item_quantity - NEW.quantity);
  
  -- Update the item's quantity
  UPDATE public.items
  SET 
    quantity_available = new_quantity,
    updated_at = now()
  WHERE id = NEW.item_id;
  
  -- Log the update for debugging
  RAISE NOTICE 'Direct sale trigger: Item % - Old quantity: %, Deducted: %, New quantity: %', 
    NEW.item_id, item_quantity, NEW.quantity, new_quantity;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Direct sale trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the triggers
CREATE TRIGGER trigger_handle_sales_stock_deduction
  AFTER INSERT ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_stock_deduction();

CREATE TRIGGER trigger_deduct_item_stock_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_item_stock_on_sale();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_sales_stock_deduction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_item_stock_on_sale() TO authenticated;

-- Test the sales trigger with a simple test
DO $$
DECLARE
    test_item_id uuid;
    test_store_id uuid;
    test_sales_order_id uuid;
    test_sales_order_item_id uuid;
    initial_quantity integer;
    final_quantity integer;
BEGIN
    RAISE NOTICE '=== TESTING SALES TRIGGER ===';
    
    -- Get test data
    SELECT id, quantity_available INTO test_item_id, initial_quantity 
    FROM items WHERE quantity_available > 5 LIMIT 1;
    
    SELECT id INTO test_store_id FROM stores LIMIT 1;
    
    IF test_item_id IS NULL OR test_store_id IS NULL THEN
        RAISE NOTICE 'ERROR: Missing required data for test';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with item: % (initial quantity: %)', test_item_id, initial_quantity;
    
    -- Create a test sales order
    INSERT INTO sales_orders (
        store_id, customer_name, customer_email, customer_phone,
        total_amount, status, order_date
    ) VALUES (
        test_store_id, 'Test Customer', 'test@example.com', '1234567890',
        300.00, 'pending', CURRENT_DATE
    ) RETURNING id INTO test_sales_order_id;
    
    RAISE NOTICE 'Created sales order: %', test_sales_order_id;
    
    -- Add sales order item (this should trigger stock deduction)
    INSERT INTO sales_order_items (
        sales_order_id, item_id, item_name, quantity, unit_price, total_price
    ) VALUES (
        test_sales_order_id, test_item_id, 'Test Sales Item', 2, 150.00, 300.00
    ) RETURNING id INTO test_sales_order_item_id;
    
    RAISE NOTICE 'Created sales order item: %', test_sales_order_item_id;
    
    -- Check result
    SELECT quantity_available INTO final_quantity FROM items WHERE id = test_item_id;
    RAISE NOTICE 'After sales order: quantity = % (expected: % - 2 = %)', 
        final_quantity, initial_quantity, initial_quantity - 2;
    
    IF final_quantity = initial_quantity - 2 THEN
        RAISE NOTICE '✅ SALES TEST PASSED: Stock correctly decreased';
    ELSE
        RAISE NOTICE '❌ SALES TEST FAILED: Stock not updated correctly';
    END IF;
    
    -- Clean up
    DELETE FROM sales_order_items WHERE id = test_sales_order_item_id;
    DELETE FROM sales_orders WHERE id = test_sales_order_id;
    
    RAISE NOTICE 'Sales test completed';
END $$;

-- Check final trigger status
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%sales%' OR trigger_name LIKE '%stock%'
AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Force schema reload
NOTIFY pgrst, 'reload schema'; 