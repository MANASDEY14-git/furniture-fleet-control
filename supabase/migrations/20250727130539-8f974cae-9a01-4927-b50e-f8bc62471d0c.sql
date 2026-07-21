-- Add BOM material deduction trigger to sales_orders table
-- This ensures materials are deducted when sales orders are created, not just direct sales

CREATE TRIGGER trigger_deduct_bom_materials_on_sales_order
    AFTER INSERT ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.deduct_bom_materials_on_sale();