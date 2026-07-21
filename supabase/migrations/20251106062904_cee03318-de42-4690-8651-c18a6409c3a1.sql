-- Conditional Stock Deduction for Sales Orders
-- Stock is deducted only when:
-- 1. Order is paid in full (balance_due = 0), OR
-- 2. Order is delivered (delivery_status = 'delivered')

-- Step 1: Add stock_deducted tracking column to sales_order_items
ALTER TABLE public.sales_order_items 
ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT FALSE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_sales_order_items_stock_deducted 
ON public.sales_order_items(order_id, stock_deducted) 
WHERE stock_deducted = FALSE;

-- Step 2: Backfill existing orders (mark them as already deducted to prevent re-deduction)
UPDATE public.sales_order_items
SET stock_deducted = TRUE
WHERE stock_deducted = FALSE;

-- Step 3: Drop old immediate stock deduction triggers
DROP TRIGGER IF EXISTS trigger_handle_sales_stock_deduction ON public.sales_order_items;
DROP TRIGGER IF EXISTS trigger_deduct_variant_stock_on_sale ON public.sales_order_items;
DROP TRIGGER IF EXISTS trigger_deduct_bom_materials ON public.sales_order_items;

-- Step 4: Create conditional stock deduction function
CREATE OR REPLACE FUNCTION public.handle_conditional_sales_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
  item_record RECORD;
  payment_total NUMERIC;
  should_deduct BOOLEAN := FALSE;
BEGIN
  -- Get order details
  SELECT * INTO order_record 
  FROM public.sales_orders 
  WHERE id = NEW.id;
  
  IF order_record.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate total payments for this order
  SELECT COALESCE(SUM(amount), 0) INTO payment_total
  FROM public.payments
  WHERE sale_id = NEW.id AND type = 'Receipt';
  
  -- Check conditions for stock deduction
  -- Condition 1: Paid in full (payment_total >= total_amount)
  IF payment_total >= order_record.total_amount THEN
    should_deduct := TRUE;
    RAISE NOTICE 'Order % is paid in full - deducting stock', NEW.order_number;
  -- Condition 2: Delivered (even with balance due)
  ELSIF order_record.delivery_status = 'delivered' THEN
    should_deduct := TRUE;
    RAISE NOTICE 'Order % is delivered - deducting stock', NEW.order_number;
  END IF;
  
  -- If conditions met, deduct stock for all items that haven't been deducted yet
  IF should_deduct THEN
    FOR item_record IN 
      SELECT * FROM public.sales_order_items 
      WHERE order_id = NEW.id 
      AND stock_deducted = FALSE
    LOOP
      -- Deduct stock from item or variant
      IF item_record.variant_id IS NOT NULL THEN
        UPDATE public.item_variants
        SET quantity_available = quantity_available - item_record.quantity,
            updated_at = NOW()
        WHERE id = item_record.variant_id;
        
        RAISE NOTICE 'Deducted % units from variant %', item_record.quantity, item_record.variant_id;
      ELSE
        UPDATE public.items
        SET quantity_available = quantity_available - item_record.quantity,
            updated_at = NOW()
        WHERE id = item_record.item_id;
        
        RAISE NOTICE 'Deducted % units from item %', item_record.quantity, item_record.item_id;
      END IF;
      
      -- Mark as deducted
      UPDATE public.sales_order_items
      SET stock_deducted = TRUE
      WHERE id = item_record.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Create trigger on sales_orders for delivery status or amount changes
CREATE TRIGGER trigger_conditional_stock_deduction
  AFTER UPDATE ON public.sales_orders
  FOR EACH ROW
  WHEN (
    OLD.delivery_status IS DISTINCT FROM NEW.delivery_status OR
    OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
    OLD.balance_due IS DISTINCT FROM NEW.balance_due
  )
  EXECUTE FUNCTION public.handle_conditional_sales_stock_deduction();

-- Step 6: Create function to check payment completion
CREATE OR REPLACE FUNCTION public.check_order_payment_for_stock_deduction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is a receipt for a sale order
  IF NEW.type = 'Receipt' AND NEW.sale_id IS NOT NULL THEN
    -- Trigger the stock deduction check by touching the order's updated_at
    UPDATE public.sales_orders
    SET updated_at = NOW()
    WHERE id = NEW.sale_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 7: Create trigger on payments to check if order is now paid in full
CREATE TRIGGER trigger_payment_stock_check
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_order_payment_for_stock_deduction();

-- Step 8: Create conditional BOM material deduction function
CREATE OR REPLACE FUNCTION public.handle_conditional_bom_material_deduction()
RETURNS TRIGGER AS $$
DECLARE
  order_record RECORD;
  payment_total NUMERIC;
  should_deduct BOOLEAN := FALSE;
  item_record RECORD;
  bom_record RECORD;
  component_record RECORD;
  customization_record RECORD;
  material_to_deduct_id UUID;
  qty_to_deduct NUMERIC;
  material_name TEXT;
BEGIN
  -- Get order details
  SELECT * INTO order_record 
  FROM public.sales_orders 
  WHERE id = NEW.id;
  
  IF order_record.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0) INTO payment_total
  FROM public.payments
  WHERE sale_id = NEW.id AND type = 'Receipt';
  
  -- Check conditions for material deduction (same as stock)
  IF payment_total >= order_record.total_amount THEN
    should_deduct := TRUE;
  ELSIF order_record.delivery_status = 'delivered' THEN
    should_deduct := TRUE;
  END IF;
  
  -- If conditions met, deduct BOM materials for items that haven't been processed
  IF should_deduct THEN
    FOR item_record IN 
      SELECT * FROM public.sales_order_items 
      WHERE order_id = NEW.id 
      AND stock_deducted = FALSE
    LOOP
      -- Find active BOM for this item
      SELECT * INTO bom_record
      FROM public.bom
      WHERE item_id = item_record.item_id AND is_active = true
      ORDER BY version DESC
      LIMIT 1;

      IF bom_record.id IS NOT NULL THEN
        -- Loop through material components
        FOR component_record IN
          SELECT * FROM public.bom_components
          WHERE bom_id = bom_record.id AND component_type = 'material'
        LOOP
          -- Check for customization
          SELECT * INTO customization_record
          FROM public.sales_customizations 
          WHERE sale_id = NEW.id AND bom_component_id = component_record.id;
          
          IF customization_record.id IS NOT NULL THEN
            -- Use customized material
            material_to_deduct_id := customization_record.selected_material_id;
            qty_to_deduct := COALESCE(customization_record.quantity_used, 0) * COALESCE(item_record.quantity, 0);
            
            SELECT name INTO material_name FROM public.materials WHERE id = material_to_deduct_id;
            
            -- Deduct customized material
            UPDATE public.materials
            SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
                updated_at = NOW()
            WHERE id = material_to_deduct_id;

            -- Log movement
            INSERT INTO public.material_stock_movements (
              material_id, movement_type, quantity_change, reference_type, reference_id, notes
            ) VALUES (
              material_to_deduct_id, 'sale', -qty_to_deduct, 'sales_order_item', item_record.id,
              '✓ CUSTOMIZED: ' || COALESCE(material_name, 'Unknown') || 
              ' | Item: ' || COALESCE(item_record.item_name, 'Unknown') || 
              ' | Order: ' || order_record.order_number
            );
          ELSE
            -- Use default material
            material_to_deduct_id := component_record.material_id;
            qty_to_deduct := COALESCE(component_record.quantity_required, 0) * COALESCE(item_record.quantity, 0);
            
            IF material_to_deduct_id IS NOT NULL AND qty_to_deduct > 0 THEN
              SELECT name INTO material_name FROM public.materials WHERE id = material_to_deduct_id;

              UPDATE public.materials
              SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
                  updated_at = NOW()
              WHERE id = material_to_deduct_id;

              INSERT INTO public.material_stock_movements (
                material_id, movement_type, quantity_change, reference_type, reference_id, notes
              ) VALUES (
                material_to_deduct_id, 'sale', -qty_to_deduct, 'sales_order_item', item_record.id,
                'DEFAULT: ' || COALESCE(material_name, 'Unknown') || 
                ' | Item: ' || COALESCE(item_record.item_name, 'Unknown') || 
                ' | Order: ' || order_record.order_number
              );
            END IF;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 9: Create trigger for BOM material deduction
CREATE TRIGGER trigger_conditional_bom_deduction
  AFTER UPDATE ON public.sales_orders
  FOR EACH ROW
  WHEN (
    OLD.delivery_status IS DISTINCT FROM NEW.delivery_status OR
    OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
    OLD.balance_due IS DISTINCT FROM NEW.balance_due
  )
  EXECUTE FUNCTION public.handle_conditional_bom_material_deduction();

-- Step 10: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_conditional_sales_stock_deduction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_order_payment_for_stock_deduction() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_conditional_bom_material_deduction() TO authenticated;

-- Step 11: Notify schema reload
NOTIFY pgrst, 'reload schema';