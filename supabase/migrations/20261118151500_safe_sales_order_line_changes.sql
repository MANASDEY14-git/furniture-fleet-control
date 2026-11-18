-- Migration: Safe sales order line changes (Add/Remove with Soft-Delete, Stock & BOM Reconciliation, Role & Store Verification)

-- 1. Add soft-delete columns to sales_order_items
ALTER TABLE public.sales_order_items
  ADD COLUMN IF NOT EXISTS is_removed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS removed_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS removed_by uuid REFERENCES auth.users(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS removal_reason text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_order_items_active 
  ON public.sales_order_items(order_id, is_removed);

-- 2. Update deduct_bom_materials_for_order_item with trigger skip guard
CREATE OR REPLACE FUNCTION public.deduct_bom_materials_for_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- SKIP GUARD: Skip if explicit session flag set by line reconciliation RPC
  IF current_setting('app.skip_bom_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- SKIP GUARD: Skip if already removed
  IF NEW.is_removed = true THEN
    RETURN NEW;
  END IF;

  -- Get the parent order for lifecycle checks
  SELECT * INTO order_record
  FROM public.sales_orders
  WHERE id = NEW.order_id;

  -- LIFECYCLE GUARD: Only process finalized orders
  IF COALESCE(order_record.document_type, 'order') != 'order' THEN
    RETURN NEW;
  END IF;

  -- STATUS GUARD: Only process confirmed or delivered orders
  IF COALESCE(order_record.status, 'confirmed') NOT IN ('confirmed', 'delivered') THEN
    RETURN NEW;
  END IF;

  -- SAFETY GUARD: Prevent re-processing
  IF order_record.bom_processed = true THEN
    RETURN NEW;
  END IF;

  -- MODULE GUARD: Check if BOM module is enabled
  IF NOT public.is_module_enabled(order_record.store_id, 'bom') THEN
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
$function$;

-- 3. Update handle_conditional_sales_stock_deduction to ignore removed lines
CREATE OR REPLACE FUNCTION public.handle_conditional_sales_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_record RECORD;
  item_record RECORD;
  payment_total NUMERIC;
  should_deduct BOOLEAN := FALSE;
BEGIN
  -- LIFECYCLE GUARD: Only process finalized orders
  IF COALESCE(NEW.document_type, 'order') != 'order' THEN
    RETURN NEW;
  END IF;

  -- SAFETY GUARD: Prevent double deduction at order level
  IF NEW.stock_deducted = true THEN
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
  ELSIF order_record.delivery_status = 'delivered' THEN
    should_deduct := TRUE;
  END IF;
  
  -- If conditions met, deduct stock for active items not yet deducted
  IF should_deduct THEN
    FOR item_record IN 
      SELECT * FROM public.sales_order_items 
      WHERE order_id = NEW.id 
      AND stock_deducted = FALSE
      AND is_removed = FALSE
    LOOP
      IF item_record.variant_id IS NOT NULL THEN
        UPDATE public.item_variants
        SET quantity_available = quantity_available - item_record.quantity,
            updated_at = NOW()
        WHERE id = item_record.variant_id;
      ELSE
        UPDATE public.items
        SET quantity_available = quantity_available - item_record.quantity,
            updated_at = NOW()
        WHERE id = item_record.item_id;
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
$function$;

-- 4. Update handle_conditional_bom_material_deduction to ignore removed lines
CREATE OR REPLACE FUNCTION public.handle_conditional_bom_material_deduction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    RETURN NEW;
  END IF;

  -- SAFETY GUARD
  IF NEW.bom_processed = true THEN
    RETURN NEW;
  END IF;

  -- MODULE GUARD
  IF NOT public.is_module_enabled(NEW.store_id, 'bom') THEN
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
      AND is_removed = FALSE
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
$function$;

-- 5. Update handle_sales_order_cancellation to ignore removed lines
CREATE OR REPLACE FUNCTION public.handle_sales_order_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      NEW.cancelled_at := NOW();
      RETURN NEW;
    END IF;

    -- SAFETY GUARD: Nothing to reverse if nothing was deducted
    IF OLD.stock_deducted = false AND OLD.bom_processed = false THEN
      NEW.cancelled_at := NOW();
      RETURN NEW;
    END IF;
    
    NEW.cancelled_at := NOW();
    
    FOR item_record IN 
      SELECT * FROM public.sales_order_items 
      WHERE order_id = NEW.id
      AND is_removed = FALSE
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
$function$;

-- 6. Create atomic, transactional RPC for modifying sales order lines
CREATE OR REPLACE FUNCTION public.modify_sales_order_line(
  p_order_id uuid,
  p_action text,                                 -- 'add' | 'remove'
  p_order_line_id uuid DEFAULT NULL,            -- for remove: id in sales_order_items
  p_item_id uuid DEFAULT NULL,                  -- for add: id in items
  p_item_name text DEFAULT NULL,
  p_variant_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_quantity integer DEFAULT 1,
  p_unit_price numeric DEFAULT 0,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_order RECORD;
  v_target_item RECORD;
  v_target_line_id uuid;
  v_active_subtotal numeric := 0;
  v_new_total numeric := 0;
  v_total_paid numeric := 0;
  v_new_balance numeric := 0;
  v_order_in_deducted_state boolean := false;
  v_new_line_id uuid;
  v_line_total numeric := 0;
  v_item_name text;
  v_bom RECORD;
  v_comp RECORD;
  v_opt RECORD;
  v_mat_usage RECORD;
  v_material_to_deduct uuid;
  v_qty_to_deduct numeric;
  v_mat_name text;
  v_mat_avg_cost numeric;
  v_deduction_source text;
  v_bom_snapshot jsonb;
BEGIN
  -- 1. Authentication check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 2. Lock the order row to prevent concurrent race conditions
  SELECT * INTO v_order
  FROM public.sales_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales order not found';
  END IF;

  -- 3. Store boundary access check
  IF NOT public.user_has_store_access(v_order.store_id) THEN
    RAISE EXCEPTION 'Access denied: user does not have access to this store';
  END IF;

  -- 4. Order status & delivery checks (reject delivered or cancelled orders)
  IF lower(COALESCE(v_order.delivery_status, '')) = 'cancelled' 
     OR lower(COALESCE(v_order.status, '')) = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot modify cancelled sales orders';
  END IF;

  IF lower(COALESCE(v_order.delivery_status, '')) = 'delivered' THEN
    RAISE EXCEPTION 'Cannot modify delivered sales orders';
  END IF;

  -- 5. Role checking: staff can add; only admin or manager can remove
  SELECT role INTO v_user_role
  FROM public.user_roles
  WHERE user_id = v_user_id;

  v_user_role := COALESCE(v_user_role, 'employee');

  IF p_action = 'remove' THEN
    IF v_user_role NOT IN ('admin', 'manager') THEN
      RAISE EXCEPTION 'Access denied: Only administrators or managers can remove items from an existing order';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
      RAISE EXCEPTION 'A reason is required to remove an item from an order';
    END IF;
  ELSIF p_action = 'add' THEN
    -- Any authorized store user can add before delivery
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than zero';
    END IF;

    IF p_unit_price IS NULL OR p_unit_price < 0 THEN
      RAISE EXCEPTION 'Unit price cannot be negative';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid action: must be "add" or "remove"';
  END IF;

  -- Calculate total payments received for this order
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.payments
  WHERE sale_id = p_order_id AND type = 'Receipt';

  -- Determine if order is in stock-deducted state
  IF v_order.stock_deducted = true 
     OR v_total_paid >= v_order.total_amount 
     OR EXISTS (
       SELECT 1 FROM public.sales_order_items 
       WHERE order_id = p_order_id AND stock_deducted = true AND is_removed = false
     ) THEN
    v_order_in_deducted_state := true;
  ELSE
    v_order_in_deducted_state := false;
  END IF;

  -- Set session flag to prevent double-processing in triggers during this transaction
  PERFORM set_config('app.skip_bom_trigger', 'true', true);

  -- =========================================================================
  -- ACTION: REMOVE LINE
  -- =========================================================================
  IF p_action = 'remove' THEN
    v_target_line_id := COALESCE(p_order_line_id, p_item_id);
    IF v_target_line_id IS NULL THEN
      RAISE EXCEPTION 'Order line ID is required for removal';
    END IF;

    SELECT * INTO v_target_item
    FROM public.sales_order_items
    WHERE id = v_target_line_id AND order_id = p_order_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order line not found';
    END IF;

    IF v_target_item.is_removed = true THEN
      RAISE EXCEPTION 'Order line is already removed';
    END IF;

    -- 1. Soft-delete line: mark removed with audit metadata
    UPDATE public.sales_order_items
    SET is_removed = true,
        removed_at = NOW(),
        removed_by = v_user_id,
        removal_reason = trim(p_reason)
    WHERE id = v_target_line_id;

    -- 2. Reconcile inventory if line had stock deducted
    IF v_target_item.stock_deducted = true THEN
      -- Restore variant stock if present
      IF v_target_item.variant_id IS NOT NULL THEN
        UPDATE public.item_variants
        SET quantity_available = quantity_available + v_target_item.quantity,
            updated_at = NOW()
        WHERE id = v_target_item.variant_id;
      END IF;

      -- Restore item stock
      IF v_target_item.item_id IS NOT NULL THEN
        UPDATE public.items
        SET quantity_available = quantity_available + v_target_item.quantity,
            updated_at = NOW()
        WHERE id = v_target_item.item_id;
      END IF;

      -- Restore recorded BOM materials exactly as consumed
      FOR v_mat_usage IN
        SELECT * FROM public.sales_order_material_usage
        WHERE sales_order_item_id = v_target_item.id
      LOOP
        UPDATE public.materials
        SET quantity_available = COALESCE(quantity_available, 0) + v_mat_usage.quantity_used,
            updated_at = NOW()
        WHERE id = v_mat_usage.material_id;

        INSERT INTO public.material_stock_movements (
          material_id, movement_type, quantity_change, reference_type, reference_id, notes
        ) VALUES (
          v_mat_usage.material_id, 'cancellation', v_mat_usage.quantity_used,
          'sales_order_item', v_target_item.id,
          'Material restored: line "' || v_target_item.item_name || '" removed from order ' || 
          COALESCE(v_order.order_number, '') || ' | Material: ' || COALESCE(v_mat_usage.material_name, 'Unknown')
        );
      END LOOP;

      -- Update line flag to indicate stock is no longer deducted
      UPDATE public.sales_order_items
      SET stock_deducted = false
      WHERE id = v_target_line_id;
    END IF;

  -- =========================================================================
  -- ACTION: ADD LINE
  -- =========================================================================
  ELSIF p_action = 'add' THEN
    v_item_name := p_item_name;
    IF v_item_name IS NULL OR trim(v_item_name) = '' THEN
      IF p_item_id IS NOT NULL THEN
        SELECT name INTO v_item_name FROM public.items WHERE id = p_item_id;
      END IF;
      IF v_item_name IS NULL OR trim(v_item_name) = '' THEN
        RAISE EXCEPTION 'Item name is required';
      END IF;
    END IF;

    v_line_total := p_quantity * p_unit_price;

    -- Insert active line
    INSERT INTO public.sales_order_items (
      order_id, item_id, item_name, variant_id, supplier_id,
      quantity, unit_price, total_price, stock_deducted, is_removed
    ) VALUES (
      p_order_id, p_item_id, v_item_name, p_variant_id, p_supplier_id,
      p_quantity, p_unit_price, v_line_total, false, false
    ) RETURNING id INTO v_new_line_id;

    -- Reconcile inventory if order is already in deducted state
    IF v_order_in_deducted_state THEN
      -- Deduct variant stock
      IF p_variant_id IS NOT NULL THEN
        UPDATE public.item_variants
        SET quantity_available = quantity_available - p_quantity,
            updated_at = NOW()
        WHERE id = p_variant_id;
      END IF;

      -- Deduct item stock
      IF p_item_id IS NOT NULL THEN
        UPDATE public.items
        SET quantity_available = quantity_available - p_quantity,
            updated_at = NOW()
        WHERE id = p_item_id;

        -- Process BOM materials if active BOM exists
        IF public.is_module_enabled(v_order.store_id, 'bom') THEN
          SELECT * INTO v_bom
          FROM public.bom
          WHERE item_id = p_item_id AND is_active = true
          ORDER BY version DESC LIMIT 1;

          IF v_bom.id IS NOT NULL THEN
            -- Build BOM snapshot
            SELECT jsonb_build_object(
              'bom_id', v_bom.id,
              'bom_name', v_bom.name,
              'bom_version', v_bom.version,
              'item_id', v_bom.item_id,
              'estimated_cost', v_bom.estimated_cost
            ) INTO v_bom_snapshot;

            INSERT INTO public.sales_order_bom_snapshot (
              sales_order_item_id, bom_id, bom_version, bom_name, snapshot_json
            ) VALUES (
              v_new_line_id, v_bom.id, v_bom.version, v_bom.name, v_bom_snapshot
            );

            -- Deduct materials
            FOR v_comp IN
              SELECT * FROM public.bom_components
              WHERE bom_id = v_bom.id AND component_type = 'material'
            LOOP
              IF v_comp.is_customizable THEN
                SELECT * INTO v_opt
                FROM public.bom_component_options
                WHERE bom_component_id = v_comp.id AND is_default = true
                LIMIT 1;

                IF v_opt.id IS NULL THEN
                  SELECT * INTO v_opt
                  FROM public.bom_component_options
                  WHERE bom_component_id = v_comp.id
                  ORDER BY created_at LIMIT 1;
                END IF;

                IF v_opt.id IS NOT NULL THEN
                  v_material_to_deduct := v_opt.material_id;
                  v_qty_to_deduct := COALESCE(v_opt.quantity_required, v_comp.quantity_required, 0) * p_quantity;
                  v_deduction_source := 'default_option';
                ELSE
                  CONTINUE;
                END IF;
              ELSE
                v_material_to_deduct := v_comp.material_id;
                v_qty_to_deduct := COALESCE(v_comp.quantity_required, 0) * p_quantity;
                v_deduction_source := 'fixed';
              END IF;

              IF v_material_to_deduct IS NOT NULL AND v_qty_to_deduct > 0 THEN
                SELECT name, COALESCE(avg_cost, 0) INTO v_mat_name, v_mat_avg_cost
                FROM public.materials WHERE id = v_material_to_deduct;

                UPDATE public.materials
                SET quantity_available = COALESCE(quantity_available, 0) - v_qty_to_deduct,
                    updated_at = NOW()
                WHERE id = v_material_to_deduct;

                INSERT INTO public.material_stock_movements (
                  material_id, movement_type, quantity_change, reference_type, reference_id, notes
                ) VALUES (
                  v_material_to_deduct, 'sale', -v_qty_to_deduct,
                  'sales_order_item', v_new_line_id,
                  'Material deducted: added to order ' || COALESCE(v_order.order_number, '') || 
                  ' | Item: ' || v_item_name || ' | Material: ' || COALESCE(v_mat_name, 'Unknown')
                );

                INSERT INTO public.sales_order_material_usage (
                  sales_order_item_id, material_id, material_name, quantity_used, unit_cost, total_cost, source
                ) VALUES (
                  v_new_line_id, v_material_to_deduct, v_mat_name, v_qty_to_deduct,
                  v_mat_avg_cost, v_qty_to_deduct * v_mat_avg_cost, v_deduction_source
                );
              END IF;
            END LOOP;
          END IF;
        END IF;
      END IF;

      -- Mark line as stock_deducted = true
      UPDATE public.sales_order_items
      SET stock_deducted = true
      WHERE id = v_new_line_id;
    END IF;
  END IF;

  -- =========================================================================
  -- RECALCULATE TOTALS & UPDATE ORDER HEADER
  -- =========================================================================
  SELECT COALESCE(SUM(total_price), 0) INTO v_active_subtotal
  FROM public.sales_order_items
  WHERE order_id = p_order_id AND is_removed = false;

  v_new_total := v_active_subtotal + COALESCE(v_order.round_off, 0);
  v_new_balance := v_new_total - v_total_paid;

  UPDATE public.sales_orders
  SET total_amount = v_new_total,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Explicit audit trail record
  INSERT INTO public.audit_trails (
    table_name, record_id, action, old_data, new_data, user_id
  ) VALUES (
    'sales_orders',
    p_order_id,
    'UPDATE',
    jsonb_build_object(
      'total_amount', v_order.total_amount,
      'action', p_action
    ),
    jsonb_build_object(
      'total_amount', v_new_total,
      'action', p_action,
      'order_line_id', COALESCE(v_new_line_id, v_target_line_id),
      'item_name', COALESCE(v_item_name, v_target_item.item_name),
      'reason', p_reason
    ),
    v_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'order_id', p_order_id,
    'order_line_id', COALESCE(v_new_line_id, v_target_line_id),
    'new_total_amount', v_new_total,
    'new_balance_due', v_new_balance,
    'total_paid', v_total_paid,
    'active_items_count', (SELECT COUNT(*) FROM public.sales_order_items WHERE order_id = p_order_id AND is_removed = false)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.modify_sales_order_line TO authenticated;

-- 7. Update get_sales_order_for_user to return soft-delete tracking, remover name, and variant details
CREATE OR REPLACE FUNCTION public.get_sales_order_for_user(_order_id uuid)
RETURNS TABLE(
  id uuid,
  order_number text,
  store_id uuid,
  supplier_id uuid,
  date date,
  total_amount numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  delivery_status text,
  advance_paid numeric,
  customer_name text,
  customer_phone text,
  customer_address text,
  description text,
  status text,
  balance_due numeric,
  delivered_at timestamp with time zone,
  delivery_date date,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  sales_order_items jsonb,
  salesperson_name text,
  round_off numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sales_orders so
    WHERE so.id = _order_id
    AND public.user_has_store_access(so.store_id)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    so.id,
    so.order_number,
    so.store_id,
    so.supplier_id,
    so.date,
    so.total_amount,
    so.created_at,
    so.updated_at,
    so.delivery_status,
    so.advance_paid,
    so.customer_name,
    so.customer_phone,
    so.customer_address,
    so.description,
    so.status,
    so.balance_due,
    so.delivered_at,
    so.delivery_date,
    so.cancelled_at,
    so.cancellation_reason,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', soi.id,
        'order_id', soi.order_id,
        'item_id', soi.item_id,
        'item_name', soi.item_name,
        'quantity', soi.quantity,
        'unit_price', soi.unit_price,
        'total_price', soi.total_price,
        'supplier_id', soi.supplier_id,
        'variant_id', soi.variant_id,
        'variant_name', iv.variant_name,
        'variant_sku', iv.sku,
        'stock_deducted', soi.stock_deducted,
        'created_at', soi.created_at,
        'discount', soi.discount,
        'is_removed', COALESCE(soi.is_removed, false),
        'removed_at', soi.removed_at,
        'removed_by', soi.removed_by,
        'removal_reason', soi.removal_reason,
        'remover_name', TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))
      ) ORDER BY soi.created_at ASC)
      FROM public.sales_order_items soi
      LEFT JOIN public.item_variants iv ON iv.id = soi.variant_id
      LEFT JOIN public.profiles p ON p.user_id = soi.removed_by
      WHERE soi.order_id = so.id),
      '[]'::jsonb
    ),
    so.salesperson_name,
    COALESCE(so.round_off, 0)
  FROM public.sales_orders so
  WHERE so.id = _order_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_sales_order_for_user(uuid) TO authenticated, anon;
