-- Fix double stock deduction issue by removing duplicate triggers

-- DROP ALL DUPLICATE STOCK DEDUCTION TRIGGERS
DROP TRIGGER IF EXISTS trigger_handle_sales_stock_deduction ON public.sales_orders;
DROP TRIGGER IF EXISTS trigger_deduct_item_stock_on_sale ON public.sales;
DROP TRIGGER IF EXISTS trigger_deduct_variant_stock_on_sale ON public.sales_order_items;
DROP TRIGGER IF EXISTS deduct_stock_on_sale ON public.sales_order_items;
DROP TRIGGER IF EXISTS handle_stock_deduction ON public.sales_orders;

-- Keep ONLY the correct trigger for sales_order_items
-- This trigger handles both regular items and variants
CREATE TRIGGER trigger_deduct_variant_stock_on_sale
  AFTER INSERT ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_variant_stock_on_sale();

-- Keep the BOM material deduction trigger (separate from item stock)
DROP TRIGGER IF EXISTS trigger_deduct_bom_materials_for_order_item ON public.sales_order_items;
CREATE TRIGGER trigger_deduct_bom_materials_for_order_item
  AFTER INSERT ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_bom_materials_for_order_item();

-- Notify schema reload
NOTIFY pgrst, 'reload schema';