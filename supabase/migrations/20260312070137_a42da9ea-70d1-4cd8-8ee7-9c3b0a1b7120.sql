-- Drop duplicate BOM cost trigger (keep trg_update_bom_estimated_cost)
DROP TRIGGER IF EXISTS update_bom_cost_trigger ON public.bom_components;

-- Drop orphaned functions with no triggers
DROP FUNCTION IF EXISTS public.deduct_item_stock_on_sale();
DROP FUNCTION IF EXISTS public.handle_sales_stock_deduction();
DROP FUNCTION IF EXISTS public.deduct_bom_materials_on_sale();
DROP FUNCTION IF EXISTS public.deduct_bom_materials_on_sales_order();
DROP FUNCTION IF EXISTS public.deduct_variant_stock_on_sale();
DROP FUNCTION IF EXISTS public.update_cost_and_stock_date();
DROP FUNCTION IF EXISTS public.update_item_cost_and_stock_date();
DROP FUNCTION IF EXISTS public.update_cost_price_on_purchase();
