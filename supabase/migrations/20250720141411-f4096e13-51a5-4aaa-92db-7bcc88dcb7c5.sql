-- First check what triggers exist using the correct system tables
SELECT 
    n.nspname AS schema_name,
    c.relname AS table_name, 
    t.tgname AS trigger_name,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public' 
  AND c.relname IN ('sales_order_items', 'sales', 'item_variants')
ORDER BY c.relname, t.tgname;

-- Drop any existing problematic triggers on sales_order_items
DROP TRIGGER IF EXISTS handle_sales_variant_stock_trigger ON sales_order_items;
DROP TRIGGER IF EXISTS deduct_variant_stock_trigger ON sales_order_items;
DROP TRIGGER IF EXISTS handle_sales_variant_stock_v2_trigger ON sales_order_items;

-- Drop any triggers on sales table that might conflict
DROP TRIGGER IF EXISTS handle_sales_variant_stock_trigger ON sales;
DROP TRIGGER IF EXISTS deduct_variant_stock_trigger ON sales;

-- Create a single, clean trigger on sales_order_items for stock deduction
CREATE TRIGGER handle_sales_stock_deduction_trigger
    AFTER INSERT ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_sales_variant_stock_v2();

-- Ensure the parent item quantity update trigger exists and works correctly
DROP TRIGGER IF EXISTS update_parent_item_quantity_trigger ON item_variants;
DROP TRIGGER IF EXISTS update_parent_item_quantity_v2_trigger ON item_variants;

CREATE TRIGGER update_parent_item_quantity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON item_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_item_quantity_v2();