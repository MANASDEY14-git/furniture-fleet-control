-- Test script to verify stock triggers are working
-- Run this after applying the migration

-- Check current trigger status
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%stock%' 
AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Check function status
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%stock%'
AND routine_schema = 'public'
ORDER BY routine_name;

-- Test 1: Purchase Stock Addition
DO $$
DECLARE
    test_item_id uuid;
    test_store_id uuid;
    test_supplier_id uuid;
    initial_quantity integer;
    final_quantity integer;
    test_purchase_id uuid;
BEGIN
    RAISE NOTICE '=== TESTING PURCHASE STOCK ADDITION ===';
    
    -- Get test data
    SELECT id, quantity_available INTO test_item_id, initial_quantity 
    FROM items LIMIT 1;
    
    SELECT id INTO test_store_id FROM stores LIMIT 1;
    SELECT id INTO test_supplier_id FROM suppliers LIMIT 1;
    
    IF test_item_id IS NULL OR test_store_id IS NULL THEN
        RAISE NOTICE 'ERROR: Missing required data for test';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with item: % (initial quantity: %)', test_item_id, initial_quantity;
    
    -- Test purchase trigger
    INSERT INTO purchases (
        store_id, item_id, item_name, supplier_id, 
        invoice_number, quantity, total_cost, date
    ) VALUES (
        test_store_id, test_item_id, 'Test Purchase Item', test_supplier_id,
        'TEST-PURCHASE-001', 10, 1000.00, CURRENT_DATE
    ) RETURNING id INTO test_purchase_id;
    
    -- Check result
    SELECT quantity_available INTO final_quantity FROM items WHERE id = test_item_id;
    RAISE NOTICE 'After purchase: quantity = % (expected: % + 10 = %)', 
        final_quantity, initial_quantity, initial_quantity + 10;
    
    IF final_quantity = initial_quantity + 10 THEN
        RAISE NOTICE '✅ PURCHASE TEST PASSED: Stock correctly increased';
    ELSE
        RAISE NOTICE '❌ PURCHASE TEST FAILED: Stock not updated correctly';
    END IF;
    
    -- Clean up
    DELETE FROM purchases WHERE id = test_purchase_id;
    
    RAISE NOTICE 'Purchase test completed';
END $$;

-- Test 2: Sales Stock Deduction
DO $$
DECLARE
    test_item_id uuid;
    test_store_id uuid;
    test_sales_order_id uuid;
    test_sales_order_item_id uuid;
    initial_quantity integer;
    final_quantity integer;
BEGIN
    RAISE NOTICE '=== TESTING SALES STOCK DEDUCTION ===';
    
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
        500.00, 'pending', CURRENT_DATE
    ) RETURNING id INTO test_sales_order_id;
    
    -- Add sales order item (this should trigger stock deduction)
    INSERT INTO sales_order_items (
        sales_order_id, item_id, item_name, quantity, unit_price, total_price
    ) VALUES (
        test_sales_order_id, test_item_id, 'Test Sales Item', 3, 166.67, 500.00
    ) RETURNING id INTO test_sales_order_item_id;
    
    -- Check result
    SELECT quantity_available INTO final_quantity FROM items WHERE id = test_item_id;
    RAISE NOTICE 'After sales order: quantity = % (expected: % - 3 = %)', 
        final_quantity, initial_quantity, initial_quantity - 3;
    
    IF final_quantity = initial_quantity - 3 THEN
        RAISE NOTICE '✅ SALES TEST PASSED: Stock correctly decreased';
    ELSE
        RAISE NOTICE '❌ SALES TEST FAILED: Stock not updated correctly';
    END IF;
    
    -- Clean up
    DELETE FROM sales_order_items WHERE id = test_sales_order_item_id;
    DELETE FROM sales_orders WHERE id = test_sales_order_id;
    
    RAISE NOTICE 'Sales test completed';
END $$;

-- Test 3: Direct Sales Stock Deduction
DO $$
DECLARE
    test_item_id uuid;
    test_store_id uuid;
    test_sale_id uuid;
    initial_quantity integer;
    final_quantity integer;
BEGIN
    RAISE NOTICE '=== TESTING DIRECT SALES STOCK DEDUCTION ===';
    
    -- Get test data
    SELECT id, quantity_available INTO test_item_id, initial_quantity 
    FROM items WHERE quantity_available > 2 LIMIT 1;
    
    SELECT id INTO test_store_id FROM stores LIMIT 1;
    
    IF test_item_id IS NULL OR test_store_id IS NULL THEN
        RAISE NOTICE 'ERROR: Missing required data for test';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with item: % (initial quantity: %)', test_item_id, initial_quantity;
    
    -- Create a direct sale (this should trigger stock deduction)
    INSERT INTO sales (
        store_id, item_id, item_name, quantity, unit_price, total_amount, sale_date
    ) VALUES (
        test_store_id, test_item_id, 'Test Direct Sale Item', 2, 100.00, 200.00, CURRENT_DATE
    ) RETURNING id INTO test_sale_id;
    
    -- Check result
    SELECT quantity_available INTO final_quantity FROM items WHERE id = test_item_id;
    RAISE NOTICE 'After direct sale: quantity = % (expected: % - 2 = %)', 
        final_quantity, initial_quantity, initial_quantity - 2;
    
    IF final_quantity = initial_quantity - 2 THEN
        RAISE NOTICE '✅ DIRECT SALES TEST PASSED: Stock correctly decreased';
    ELSE
        RAISE NOTICE '❌ DIRECT SALES TEST FAILED: Stock not updated correctly';
    END IF;
    
    -- Clean up
    DELETE FROM sales WHERE id = test_sale_id;
    
    RAISE NOTICE 'Direct sales test completed';
END $$;

-- Final verification
SELECT 
    'Current item quantities:' as info,
    id,
    name,
    quantity_available,
    updated_at
FROM items 
ORDER BY updated_at DESC 
LIMIT 5; 