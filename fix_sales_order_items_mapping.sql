-- Fix sales order items mapping issue
-- Run this in your Supabase SQL Editor

-- Check the sales_order_items table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'sales_order_items'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any existing sales_order_items records
SELECT COUNT(*) as total_sales_order_items FROM sales_order_items;

-- Check the actual column name for the foreign key
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'sales_order_items';

-- Let's check what the frontend is actually sending
-- The issue might be that the frontend is using 'order_id' but the table expects 'sales_order_id'

-- Check if there are any sales_order_items with order_id column
SELECT * FROM sales_order_items LIMIT 5;

-- If the table has 'order_id' instead of 'sales_order_id', we need to update the frontend
-- Or if it has 'sales_order_id', we need to update the frontend to use the correct column name 