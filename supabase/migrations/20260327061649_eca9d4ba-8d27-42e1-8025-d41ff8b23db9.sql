
-- =============================================
-- TRIGGER SAFETY LAYER UPGRADE
-- Lifecycle-Aware + Module-Aware Guards
-- =============================================

-- 1. Create is_module_enabled helper (always true for now, future-proofing)
CREATE OR REPLACE FUNCTION public.is_module_enabled(_store_id uuid, _module text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT true;
$$;

GRANT EXECUTE ON FUNCTION public.is_module_enabled(uuid, text) TO authenticated;

-- 2. Update handle_conditional_sales_stock_deduction
CREATE OR REPLACE FUNCTION public.handle_conditional_sales_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_record RECORD;
  item_record RECORD;
  payment_total NUMERIC;
  should_deduct BOOLEAN := FALSE;
BEGIN
  -- LIFECYCLE GUARD: Only process finalized orders
  IF COALESCE(NEW.document_type, 'order') != 'order' THEN
    RAISE LOG 'Stock trigger skipped: document_type is % (not order)', NEW.document_type;
    RETURN NEW;
  END IF;

  -- SAFETY GUARD: Prevent double deduction at order level
  IF NEW.stock_deducted = true THEN
    RAISE LOG 'Stock trigger skipped: stock already deducted for order %', NEW.order_number;
    RETURN NEW;
  END IF;

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
  IF payment_total >= order_record.total_amount THEN
    should_deduct := TRUE;
    RAISE LOG 'Order % is paid in full - deducting stock', NEW.order_number;
  ELSIF order_record.delivery_status = 'delivered' THEN
    should_deduct := TRUE;
    RAISE LOG 'Order % is delivered - deducting stock', NEW.order_number;
  END IF;
  
  -- If conditions met, deduct stock for all items that haven't been deducted yet
  IF should_deduct THEN
    FOR item_record IN 
      SELECT * FROM public.sales_order_items 
      WHERE order_id = NEW.id 
      AND stock_deducted = FALSE
    LOOP
      IF item_record.variant_id IS NOT NULL THEN
        UPDATE public.item_variants
        SET quantity_available = quantity_available - item_record.quantity,
            updated_at = NOW()
        WHERE id = item_record.variant_id;
        
        RAISE LOG 'Deducted % units from variant %', item_record.quantity, item_record.variant_id;
      ELSE
        UPDATE public.items
        SET quantity_available = quantity_available - item_record.quantity,
            updated_at = NOW()
        WHERE id = item_record.item_id;
        
        RAISE LOG 'Deducted % units from item %', item_record.quantity, item_record.item_id;
      END IF;
      
      UPDATE public.sales_order_items
      SET stock_deducted = TRUE
      WHERE id = item_record.id;
    END LOOP;

    -- Mark order-level flag
    NEW.stock_deducted := TRUE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Update deduct_bom_materials_for_order_item
CREATE OR REPLACE FUNCTION public.deduct_bom_materials_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_record RECORD;
  bom_record RECORD;
  component_record RECORD;
  customization_record RECORD;
  option_record RECORD;
  material_to_deduct_id uuid;
  qty_to_deduct numeric;
  material_name text;
  material_avg_cost numeric;
  has_customization boolean;
  deduction_source text;
  bom_snapshot jsonb;
BEGIN
  -- Get the parent order for lifecycle checks
  SELECT * INTO order_record
  FROM public.sales_orders
  WHERE id = NEW.order_id;

  -- LIFECYCLE GUARD: Only process finalized orders
  IF COALESCE(order_record.document_type, 'order') != 'order' THEN
    RAISE LOG 'BOM trigger skipped: document_type is % for order %', order_record.document_type, order_record.order_number;
    RETURN NEW;
  END IF;

  -- STATUS GUARD: Only process confirmed or delivered orders
  IF COALESCE(order_record.status, 'confirmed') NOT IN ('confirmed', 'delivered') THEN
    RAISE LOG 'BOM trigger skipped: status is % for order %', order_record.status, order_record.order_number;
    RETURN NEW;
  END IF;

  -- SAFETY GUARD: Prevent re-processing
  IF order_record.bom_processed = true THEN
    RAISE LOG 'BOM trigger skipped: already processed for order %', order_record.order_number;
    RETURN NEW;
  END IF;

  -- MODULE GUARD: Check if BOM module is enabled
  IF NOT public.is_module_enabled(order_record.store_id, 'bom') THEN
    RAISE LOG 'BOM trigger skipped: BOM module not enabled for store %', order_record.store_id;
    RETURN NEW;
  END IF;

  -- Find the active BOM for the item
  SELECT * INTO bom_record
  FROM public.bom
  WHERE item_id = NEW.item_id AND is_active = true
  ORDER BY version DESC
  LIMIT 1;

  IF bom_record.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- BUILD BOM SNAPSHOT
  SELECT jsonb_build_object(
    'bom_id', bom_record.id,
    'bom_name', bom_record.name,
    'bom_version', bom_record.version,
    'item_id', bom_record.item_id,
    'estimated_cost', bom_record.estimated_cost,
    'components', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', bc.id,
        'component_name', bc.component_name,
        'component_type', bc.component_type,
        'material_id', bc.material_id,
        'quantity_required', bc.quantity_required,
        'is_customizable', bc.is_customizable,
        'hourly_rate', bc.hourly_rate,
        'time_hours', bc.time_hours,
        'time_minutes', bc.time_minutes,
        'service_cost', bc.service_cost,
        'notes', bc.notes,
        'material', (SELECT jsonb_build_object('id', m.id, 'name', m.name, 'unit', m.unit, 'avg_cost', m.avg_cost) FROM public.materials m WHERE m.id = bc.material_id),
        'options', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', bco.id,
            'option_name', bco.option_name,
            'material_id', bco.material_id,
            'quantity_required', bco.quantity_required,
            'price_adjustment', bco.price_adjustment,
            'is_default', bco.is_default,
            'material', (SELECT jsonb_build_object('id', m2.id, 'name', m2.name, 'unit', m2.unit, 'avg_cost', m2.avg_cost) FROM public.materials m2 WHERE m2.id = bco.material_id)
          ))
          FROM public.bom_component_options bco WHERE bco.bom_component_id = bc.id
        ), '[]'::jsonb)
      ))
      FROM public.bom_components bc WHERE bc.bom_id = bom_record.id
    ), '[]'::jsonb)
  ) INTO bom_snapshot;

  INSERT INTO public.sales_order_bom_snapshot (
    sales_order_item_id, bom_id, bom_version, bom_name, snapshot_json
  ) VALUES (
    NEW.id, bom_record.id, bom_record.version, bom_record.name, bom_snapshot
  );

  -- DEDUCT MATERIALS + RECORD USAGE
  FOR component_record IN
    SELECT * FROM public.bom_components
    WHERE bom_id = bom_record.id AND component_type = 'material'
  LOOP
    SELECT * INTO customization_record
    FROM public.sales_customizations 
    WHERE sale_id = NEW.order_id AND bom_component_id = component_record.id;
    
    has_customization := (customization_record.id IS NOT NULL);
    
    IF has_customization THEN
      material_to_deduct_id := customization_record.selected_material_id;
      qty_to_deduct := COALESCE(customization_record.quantity_used, 0) * COALESCE(NEW.quantity, 0);
      deduction_source := 'customized';
      
      SELECT name, COALESCE(avg_cost, 0) INTO material_name, material_avg_cost
      FROM public.materials WHERE id = material_to_deduct_id;
      
      UPDATE public.materials
      SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
          updated_at = now()
      WHERE id = material_to_deduct_id;

      INSERT INTO public.material_stock_movements (
        material_id, movement_type, quantity_change, reference_type, reference_id, notes
      ) VALUES (
        material_to_deduct_id, 'sale', -qty_to_deduct, 'sales_order_item', NEW.id,
        '✓ CUSTOMIZED material: ' || COALESCE(material_name, 'Unknown') || 
        ' | Item: ' || COALESCE(NEW.item_name, 'Unknown') || 
        ' | Component: ' || COALESCE(component_record.component_name, 'Unknown') || 
        ' | Option: ' || COALESCE(customization_record.selected_option_name, 'Custom choice')
      );

      INSERT INTO public.sales_order_material_usage (
        sales_order_item_id, material_id, material_name, quantity_used, unit_cost, total_cost, source
      ) VALUES (
        NEW.id, material_to_deduct_id, material_name, qty_to_deduct,
        material_avg_cost, qty_to_deduct * material_avg_cost, 'customized'
      );
      
    ELSE
      IF component_record.is_customizable THEN
        SELECT * INTO option_record
        FROM public.bom_component_options
        WHERE bom_component_id = component_record.id AND is_default = true
        LIMIT 1;
        
        IF option_record.id IS NULL THEN
          SELECT * INTO option_record
          FROM public.bom_component_options
          WHERE bom_component_id = component_record.id
          ORDER BY created_at
          LIMIT 1;
        END IF;
        
        IF option_record.id IS NULL THEN
          CONTINUE;
        END IF;
        
        material_to_deduct_id := option_record.material_id;
        qty_to_deduct := COALESCE(option_record.quantity_required, component_record.quantity_required, 0) * COALESCE(NEW.quantity, 0);
        deduction_source := 'default_option';
      ELSE
        material_to_deduct_id := component_record.material_id;
        qty_to_deduct := COALESCE(component_record.quantity_required, 0) * COALESCE(NEW.quantity, 0);
        deduction_source := 'fixed';
      END IF;
      
      IF material_to_deduct_id IS NULL OR qty_to_deduct = 0 THEN
        CONTINUE;
      END IF;

      SELECT name, COALESCE(avg_cost, 0) INTO material_name, material_avg_cost
      FROM public.materials WHERE id = material_to_deduct_id;

      UPDATE public.materials
      SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
          updated_at = now()
      WHERE id = material_to_deduct_id;

      INSERT INTO public.material_stock_movements (
        material_id, movement_type, quantity_change, reference_type, reference_id, notes
      ) VALUES (
        material_to_deduct_id, 'sale', -qty_to_deduct, 'sales_order_item', NEW.id,
        'DEFAULT material: ' || COALESCE(material_name, 'Unknown') || 
        ' | Item: ' || COALESCE(NEW.item_name, 'Unknown') || 
        ' | Component: ' || COALESCE(component_record.component_name, 'Unknown')
      );

      INSERT INTO public.sales_order_material_usage (
        sales_order_item_id, material_id, material_name, quantity_used, unit_cost, total_cost, source
      ) VALUES (
        NEW.id, material_to_deduct_id, material_name, qty_to_deduct,
        material_avg_cost, qty_to_deduct * material_avg_cost, deduction_source
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 4. Update handle_sales_order_cancellation
CREATE OR REPLACE FUNCTION public.handle_sales_order_cancellation()
RETURNS trigger
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

    -- LIFECYCLE GUARD: Only reverse for actual orders
    IF COALESCE(OLD.document_type, 'order') != 'order' THEN
      RAISE LOG 'Cancellation trigger skipped: document_type is % for order %', OLD.document_type, OLD.order_number;
      NEW.cancelled_at := NOW();
      RETURN NEW;
    END IF;

    -- SAFETY GUARD: Nothing to reverse if nothing was deducted
    IF OLD.stock_deducted = false AND OLD.bom_processed = false THEN
      RAISE LOG 'Cancellation trigger skipped: no stock/BOM to reverse for order %', OLD.order_number;
      NEW.cancelled_at := NOW();
      RETURN NEW;
    END IF;
    
    NEW.cancelled_at := NOW();
    
    FOR item_record IN 
      SELECT * FROM public.sales_order_items WHERE order_id = NEW.id
    LOOP
      IF item_record.stock_deducted THEN
        
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
        
        UPDATE public.sales_order_items
        SET stock_deducted = FALSE
        WHERE id = item_record.id;
        
        SELECT * INTO bom_record
        FROM public.bom
        WHERE item_id = item_record.item_id AND is_active = true
        ORDER BY version DESC LIMIT 1;
        
        IF bom_record.id IS NOT NULL THEN
          FOR component_record IN
            SELECT * FROM public.bom_components
            WHERE bom_id = bom_record.id AND component_type = 'material'
          LOOP
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
              SELECT name INTO material_name FROM public.materials WHERE id = material_id_to_restore;
              
              UPDATE public.materials
              SET quantity_available = COALESCE(quantity_available, 0) + qty_to_restore,
                  updated_at = NOW()
              WHERE id = material_id_to_restore;
              
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

    -- Reset order-level flags
    NEW.stock_deducted := FALSE;
    NEW.bom_processed := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Update handle_conditional_bom_material_deduction
CREATE OR REPLACE FUNCTION public.handle_conditional_bom_material_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_record RECORD;
  payment_total NUMERIC;
  should_deduct BOOLEAN := FALSE;
  item_record RECORD;
  bom_record RECORD;
  component_record RECORD;
  customization_record RECORD;
  option_record RECORD;
  material_to_deduct_id UUID;
  qty_to_deduct NUMERIC;
  material_name TEXT;
BEGIN
  -- LIFECYCLE GUARD
  IF COALESCE(NEW.document_type, 'order') != 'order' THEN
    RAISE LOG 'BOM conditional trigger skipped: document_type is %', NEW.document_type;
    RETURN NEW;
  END IF;

  -- SAFETY GUARD
  IF NEW.bom_processed = true THEN
    RAISE LOG 'BOM conditional trigger skipped: already processed for order %', NEW.order_number;
    RETURN NEW;
  END IF;

  -- MODULE GUARD
  IF NOT public.is_module_enabled(NEW.store_id, 'bom') THEN
    RAISE LOG 'BOM conditional trigger skipped: module not enabled for store %', NEW.store_id;
    RETURN NEW;
  END IF;

  SELECT * INTO order_record 
  FROM public.sales_orders 
  WHERE id = NEW.id;
  
  IF order_record.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(SUM(amount), 0) INTO payment_total
  FROM public.payments
  WHERE sale_id = NEW.id AND type = 'Receipt';
  
  IF payment_total >= order_record.total_amount THEN
    should_deduct := TRUE;
  ELSIF order_record.delivery_status = 'delivered' THEN
    should_deduct := TRUE;
  END IF;
  
  IF should_deduct THEN
    FOR item_record IN 
      SELECT * FROM public.sales_order_items 
      WHERE order_id = NEW.id 
      AND stock_deducted = FALSE
    LOOP
      SELECT * INTO bom_record
      FROM public.bom
      WHERE item_id = item_record.item_id AND is_active = true
      ORDER BY version DESC LIMIT 1;

      IF bom_record.id IS NOT NULL THEN
        FOR component_record IN
          SELECT * FROM public.bom_components
          WHERE bom_id = bom_record.id AND component_type = 'material'
        LOOP
          SELECT * INTO customization_record
          FROM public.sales_customizations 
          WHERE sale_id = NEW.id AND bom_component_id = component_record.id;
          
          IF customization_record.id IS NOT NULL THEN
            material_to_deduct_id := customization_record.selected_material_id;
            qty_to_deduct := COALESCE(customization_record.quantity_used, 0) * COALESCE(item_record.quantity, 0);
            
            SELECT name INTO material_name FROM public.materials WHERE id = material_to_deduct_id;
            
            UPDATE public.materials
            SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
                updated_at = NOW()
            WHERE id = material_to_deduct_id;

            INSERT INTO public.material_stock_movements (
              material_id, movement_type, quantity_change, reference_type, reference_id, notes
            ) VALUES (
              material_to_deduct_id, 'sale', -qty_to_deduct, 'sales_order_item', item_record.id,
              '✓ CUSTOMIZED: ' || COALESCE(material_name, 'Unknown') || 
              ' | Item: ' || COALESCE(item_record.item_name, 'Unknown') || 
              ' | Order: ' || order_record.order_number
            );
          ELSE
            IF component_record.is_customizable THEN
              SELECT * INTO option_record
              FROM public.bom_component_options
              WHERE bom_component_id = component_record.id AND is_default = true
              LIMIT 1;
              
              IF option_record.id IS NULL THEN
                SELECT * INTO option_record
                FROM public.bom_component_options
                WHERE bom_component_id = component_record.id
                ORDER BY created_at LIMIT 1;
              END IF;
              
              IF option_record.id IS NULL THEN CONTINUE; END IF;
              
              material_to_deduct_id := option_record.material_id;
              qty_to_deduct := COALESCE(option_record.quantity_required, component_record.quantity_required, 0) * COALESCE(item_record.quantity, 0);
            ELSE
              material_to_deduct_id := component_record.material_id;
              qty_to_deduct := COALESCE(component_record.quantity_required, 0) * COALESCE(item_record.quantity, 0);
            END IF;
            
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
$$;

-- 6. Update check_order_payment_for_stock_deduction
CREATE OR REPLACE FUNCTION public.check_order_payment_for_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_doc_type text;
BEGIN
  IF NEW.type = 'Receipt' AND NEW.sale_id IS NOT NULL THEN
    -- LIFECYCLE GUARD
    SELECT document_type INTO order_doc_type
    FROM public.sales_orders WHERE id = NEW.sale_id;

    IF COALESCE(order_doc_type, 'order') != 'order' THEN
      RAISE LOG 'Payment stock trigger skipped: document_type is % for sale %', order_doc_type, NEW.sale_id;
      RETURN NEW;
    END IF;

    UPDATE public.sales_orders
    SET updated_at = NOW()
    WHERE id = NEW.sale_id;
  END IF;
  
  RETURN NEW;
END;
$$;
