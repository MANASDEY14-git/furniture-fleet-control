-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_handle_sales_stock_deduction ON public.sales_orders;
DROP TRIGGER IF EXISTS trigger_update_item_stock_on_purchase ON public.purchases;
DROP TRIGGER IF EXISTS trigger_deduct_item_stock_on_sale ON public.sales;

-- Drop all variant-related triggers and functions
DROP TRIGGER IF EXISTS update_variant_stock_on_purchase_trigger ON public.purchases;
DROP TRIGGER IF EXISTS handle_sales_variant_stock_trigger ON public.sales_orders;
DROP TRIGGER IF EXISTS deduct_variant_stock_on_sale_trigger ON public.sales;
DROP TRIGGER IF EXISTS handle_sales_stock_deduction_trigger ON public.sales_order_items;

-- Now drop the functions with CASCADE
DROP FUNCTION IF EXISTS public.handle_sales_variant_stock_v2() CASCADE;
DROP FUNCTION IF EXISTS public.handle_sales_variant_stock() CASCADE;
DROP FUNCTION IF EXISTS public.update_variant_stock_on_purchase() CASCADE;
DROP FUNCTION IF EXISTS public.update_parent_item_quantity_v2() CASCADE;
DROP FUNCTION IF EXISTS public.update_parent_item_quantity() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_variant_stock_on_sale() CASCADE;

-- Create new triggers for the new functions (functions already exist)
CREATE TRIGGER trigger_handle_sales_stock_deduction
  AFTER INSERT ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_stock_deduction();

CREATE TRIGGER trigger_update_item_stock_on_purchase
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_item_stock_on_purchase();

CREATE TRIGGER trigger_deduct_item_stock_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_item_stock_on_sale();