-- Add cancellation tracking columns to sales_orders
ALTER TABLE public.sales_orders 
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Create function to handle sales order cancellation
CREATE OR REPLACE FUNCTION public.handle_sales_order_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item_record RECORD;
  bom_record RECORD;
  component_record RECORD;
  customization_record RECORD;
  material_id_to_restore uuid;
  qty_to_restore numeric;
  material_name text;
BEGIN
  -- Only process if status changed TO 'Cancelled'
  IF NEW.delivery_status = 'Cancelled' AND OLD.delivery_status != 'Cancelled' THEN
    
    -- Set cancellation timestamp
    NEW.cancelled_at := NOW();
    
    -- Loop through all order items
    FOR item_record IN 
      SELECT * FROM public.sales_order_items WHERE order_id = NEW.id
    LOOP
      -- Only reverse if stock was deducted
      IF item_record.stock_deducted THEN
        
        -- Restore stock to item or variant
        IF item_record.variant_id IS NOT NULL THEN
          UPDATE public.item_variants
          SET quantity_available = quantity_available + item_record.quantity,
              updated_at = NOW()
          WHERE id = item_record.variant_id;
        ELSE
          UPDATE public.items
          SET quantity_available = quantity_available + item_record.quantity,
              updated_at = NOW()
          WHERE id = item_record.item_id;
        END IF;
        
        -- Mark stock as restored (set to false since stock is no longer deducted)
        UPDATE public.sales_order_items
        SET stock_deducted = FALSE
        WHERE id = item_record.id;
        
        -- Reverse BOM material deductions
        SELECT * INTO bom_record
        FROM public.bom
        WHERE item_id = item_record.item_id AND is_active = true
        ORDER BY version DESC LIMIT 1;
        
        IF bom_record.id IS NOT NULL THEN
          FOR component_record IN
            SELECT * FROM public.bom_components
            WHERE bom_id = bom_record.id AND component_type = 'material'
          LOOP
            -- Check for customization
            SELECT * INTO customization_record
            FROM public.sales_customizations
            WHERE sale_id = NEW.id AND bom_component_id = component_record.id;
            
            IF customization_record.id IS NOT NULL THEN
              material_id_to_restore := customization_record.selected_material_id;
              qty_to_restore := customization_record.quantity_used * item_record.quantity;
            ELSE
              material_id_to_restore := component_record.material_id;
              qty_to_restore := component_record.quantity_required * item_record.quantity;
            END IF;
            
            IF material_id_to_restore IS NOT NULL AND qty_to_restore > 0 THEN
              -- Get material name for logging
              SELECT name INTO material_name FROM public.materials WHERE id = material_id_to_restore;
              
              -- Restore material stock
              UPDATE public.materials
              SET quantity_available = COALESCE(quantity_available, 0) + qty_to_restore,
                  updated_at = NOW()
              WHERE id = material_id_to_restore;
              
              -- Log reversal
              INSERT INTO public.material_stock_movements (
                material_id, movement_type, quantity_change,
                reference_type, reference_id, notes
              ) VALUES (
                material_id_to_restore, 'cancellation', qty_to_restore,
                'sales_order', NEW.id,
                'CANCELLED ORDER: Stock restored for order ' || NEW.order_number || 
                ' | Material: ' || COALESCE(material_name, 'Unknown') ||
                ' | Item: ' || item_record.item_name
              );
            END IF;
          END LOOP;
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for sales order cancellation
DROP TRIGGER IF EXISTS trigger_handle_sales_order_cancellation ON public.sales_orders;
CREATE TRIGGER trigger_handle_sales_order_cancellation
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_order_cancellation();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_sales_order_cancellation() TO authenticated;