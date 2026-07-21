-- Test script to verify purchase and sales triggers are working
-- Run this in your Supabase SQL Editor to test the triggers

-- First, let's check if we have any items to test with
SELECT id, name, quantity_available, cost_price FROM items LIMIT 5;

-- Test 1: Create a purchase and verify stock increases
-- Replace 'item-id-here' with an actual item ID from the query above
DO $$
DECLARE
    test_item_id uuid;
    initial_quantity integer;
    final_quantity integer;
BEGIN
    -- Get a test item
    SELECT id, quantity_available INTO test_item_id, initial_quantity 
    FROM items LIMIT 1;
    
    IF test_item_id IS NULL THEN
        RAISE NOTICE 'No items found to test with';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing purchase trigger with item: % (initial quantity: %)', test_item_id, initial_quantity;
    
    -- Create a purchase
    INSERT INTO purchases (
        store_id, 
        item_id, 
        item_name, 
        supplier_id, 
        invoice_number, 
        quantity, 
        total_cost, 
        date
    ) VALUES (
        (SELECT id FROM stores LIMIT 1),
        test_item_id,
        'Test Item',
        (SELECT id FROM suppliers LIMIT 1),
        'TEST-INV-001',
        10,
        1000.00,
        CURRENT_DATE
    );
    
    -- Check the new quantity
    SELECT quantity_available INTO final_quantity FROM items WHERE id = test_item_id;
    
    RAISE NOTICE 'Purchase created. Final quantity: % (should be % + 10)', final_quantity, initial_quantity;
    
    -- Clean up the test purchase
    DELETE FROM purchases WHERE invoice_number = 'TEST-INV-001';
    
    RAISE NOTICE 'Test purchase cleaned up';
END $$;

-- Test 2: Create a sales order and verify stock decreases
DO $$
DECLARE
    test_item_id uuid;
    test_store_id uuid;
    test_supplier_id uuid;
    initial_quantity integer;
    final_quantity integer;
    sales_order_id uuid;
BEGIN
    -- Get test data
    SELECT id, quantity_available INTO test_item_id, initial_quantity 
    FROM items LIMIT 1;
    
    SELECT id INTO test_store_id FROM stores LIMIT 1;
    SELECT id INTO test_supplier_id FROM suppliers LIMIT 1;
    
    IF test_item_id IS NULL OR test_store_id IS NULL THEN
        RAISE NOTICE 'Missing required data for sales test';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing sales trigger with item: % (initial quantity: %)', test_item_id, initial_quantity;
    
    -- Create a sales order
    INSERT INTO sales_orders (
        order_number,
        store_id,
        supplier_id,
        delivery_status,
        date,
        customer_name,
        total_amount
    ) VALUES (
        'TEST-ORDER-001',
        test_store_id,
        test_supplier_id,
        'Pending',
        CURRENT_DATE,
        'Test Customer',
        500.00
    ) RETURNING id INTO sales_order_id;
    
    -- Create sales order item
    INSERT INTO sales_order_items (
        order_id,
        item_id,
        item_name,
        quantity,
        unit_price,
        total_price
    ) VALUES (
        sales_order_id,
        test_item_id,
        'Test Item',
        5,
        100.00,
        500.00
    );
    
    -- Check the new quantity
    SELECT quantity_available INTO final_quantity FROM items WHERE id = test_item_id;
    
    RAISE NOTICE 'Sales order created. Final quantity: % (should be % - 5)', final_quantity, initial_quantity;
    
    -- Clean up the test sales order
    DELETE FROM sales_order_items WHERE order_id = sales_order_id;
    DELETE FROM sales_orders WHERE id = sales_order_id;
    
    RAISE NOTICE 'Test sales order cleaned up';
END $$;

-- Test 3: Check trigger status
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%stock%' 
AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Test 4: Check function status
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%stock%'
ORDER BY routine_name; 