-- Update the trigger function to use option's quantity_required if available
CREATE OR REPLACE FUNCTION public.deduct_bom_materials_for_order_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  bom_record RECORD;
  component_record RECORD;
  customization_record RECORD;
  option_record RECORD;
  material_to_deduct_id uuid;
  qty_to_deduct numeric;
  material_name text;
  has_customization boolean;
BEGIN
  -- Find the active BOM for the item
  SELECT * INTO bom_record
  FROM public.bom
  WHERE item_id = NEW.item_id AND is_active = true
  ORDER BY version DESC
  LIMIT 1;

  IF bom_record.id IS NULL THEN
    RETURN NEW; -- No BOM, nothing to deduct
  END IF;

  -- Loop through material components
  FOR component_record IN
    SELECT * FROM public.bom_components
    WHERE bom_id = bom_record.id AND component_type = 'material'
  LOOP
    -- CRITICAL FIX: Check for customization FIRST
    SELECT * INTO customization_record
    FROM public.sales_customizations 
    WHERE sale_id = NEW.order_id AND bom_component_id = component_record.id;
    
    has_customization := (customization_record.id IS NOT NULL);
    
    -- Decision logic: Use customized material OR default material, NEVER both
    IF has_customization THEN
      -- Use ONLY customized material
      material_to_deduct_id := customization_record.selected_material_id;
      
      -- Get the option to check for option-specific quantity
      SELECT * INTO option_record
      FROM public.bom_component_options
      WHERE bom_component_id = component_record.id 
        AND material_id = customization_record.selected_material_id;
      
      -- Use option's quantity_required if set, otherwise use customization's quantity_used
      -- The quantity_used in customization already has the correct value from the UI
      qty_to_deduct := COALESCE(customization_record.quantity_used, 0) * COALESCE(NEW.quantity, 0);
      
      -- Get material name for logging
      SELECT name INTO material_name FROM public.materials WHERE id = material_to_deduct_id;
      
      -- Deduct customized material stock
      UPDATE public.materials
      SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
          updated_at = now()
      WHERE id = material_to_deduct_id;

      -- Log customized material movement
      INSERT INTO public.material_stock_movements (
        material_id,
        movement_type,
        quantity_change,
        reference_type,
        reference_id,
        notes
      ) VALUES (
        material_to_deduct_id,
        'sale',
        -qty_to_deduct,
        'sales_order_item',
        NEW.id,
        '✓ CUSTOMIZED material: ' || COALESCE(material_name, 'Unknown') || 
        ' | Item: ' || COALESCE(NEW.item_name, 'Unknown') || 
        ' | Component: ' || COALESCE(component_record.component_name, 'Unknown') || 
        ' | Option: ' || COALESCE(customization_record.selected_option_name, 'Custom choice')
      );
      
    ELSE
      -- Only deduct default material if this is NOT a customizable component
      -- OR if it's a customizable component, use the default option's material
      IF component_record.is_customizable THEN
        -- Get the default option
        SELECT * INTO option_record
        FROM public.bom_component_options
        WHERE bom_component_id = component_record.id 
          AND is_default = true
        LIMIT 1;
        
        -- If no default found, skip this component (customer must select)
        IF option_record.id IS NULL THEN
          -- Try to get the first option as fallback
          SELECT * INTO option_record
          FROM public.bom_component_options
          WHERE bom_component_id = component_record.id
          ORDER BY created_at
          LIMIT 1;
        END IF;
        
        IF option_record.id IS NULL THEN
          -- No options configured, skip
          CONTINUE;
        END IF;
        
        material_to_deduct_id := option_record.material_id;
        -- Use option's quantity if set, otherwise use component's quantity
        qty_to_deduct := COALESCE(option_record.quantity_required, component_record.quantity_required, 0) * COALESCE(NEW.quantity, 0);
      ELSE
        -- Fixed component - use default material from BOM
        material_to_deduct_id := component_record.material_id;
        qty_to_deduct := COALESCE(component_record.quantity_required, 0) * COALESCE(NEW.quantity, 0);
      END IF;
      
      IF material_to_deduct_id IS NULL OR qty_to_deduct = 0 THEN
        CONTINUE; -- Skip if no material or zero quantity
      END IF;

      -- Get material name for logging
      SELECT name INTO material_name FROM public.materials WHERE id = material_to_deduct_id;

      -- Deduct default material stock
      UPDATE public.materials
      SET quantity_available = COALESCE(quantity_available, 0) - qty_to_deduct,
          updated_at = now()
      WHERE id = material_to_deduct_id;

      -- Log default material movement
      INSERT INTO public.material_stock_movements (
        material_id,
        movement_type,
        quantity_change,
        reference_type,
        reference_id,
        notes
      ) VALUES (
        material_to_deduct_id,
        'sale',
        -qty_to_deduct,
        'sales_order_item',
        NEW.id,
        'DEFAULT material: ' || COALESCE(material_name, 'Unknown') || 
        ' | Item: ' || COALESCE(NEW.item_name, 'Unknown') || 
        ' | Component: ' || COALESCE(component_record.component_name, 'Unknown')
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Also update the conditional BOM material deduction function
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
            -- Handle customizable vs fixed components
            IF component_record.is_customizable THEN
              -- Get default option
              SELECT * INTO option_record
              FROM public.bom_component_options
              WHERE bom_component_id = component_record.id 
                AND is_default = true
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
              qty_to_deduct := COALESCE(option_record.quantity_required, component_record.quantity_required, 0) * COALESCE(item_record.quantity, 0);
            ELSE
              -- Use default material
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