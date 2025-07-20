-- Remove duplicate stock deduction triggers - keep only the latest one
DROP TRIGGER IF EXISTS handle_sales_variant_stock_trigger_v2 ON sales_order_items;
DROP TRIGGER IF EXISTS sales_variant_stock_trigger ON sales_order_items;
DROP TRIGGER IF EXISTS trg_deduct_variant_stock_on_sale ON sales_order_items;

-- Keep only the main trigger: handle_sales_stock_deduction_trigger