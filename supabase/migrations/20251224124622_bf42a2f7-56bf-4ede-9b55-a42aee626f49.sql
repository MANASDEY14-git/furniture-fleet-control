-- Fix update_material_stock_on_purchase function with proper schema prefix
CREATE OR REPLACE FUNCTION public.update_material_stock_on_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Update material stock (allow negative starting values)
  UPDATE public.materials 
  SET quantity_available = COALESCE(quantity_available, 0) + NEW.quantity,
      cost_price = NEW.unit_cost,
      updated_at = now()
  WHERE id = NEW.material_id;
  
  -- Log stock movement with detailed information
  INSERT INTO public.material_stock_movements (
    material_id, 
    movement_type, 
    quantity_change, 
    reference_type, 
    reference_id, 
    notes
  ) VALUES (
    NEW.material_id, 
    'purchase', 
    NEW.quantity, 
    'material_purchase', 
    NEW.id, 
    'Material purchased - Invoice: ' || COALESCE(NEW.invoice_number, 'N/A') || ', Unit Cost: ₹' || NEW.unit_cost
  );
  
  RETURN NEW;
END;
$function$;

-- Fix create_supplier_ledger_entry_for_material_purchase function with proper schema prefix
CREATE OR REPLACE FUNCTION public.create_supplier_ledger_entry_for_material_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create supplier ledger entry if supplier_id is provided
  IF NEW.supplier_id IS NOT NULL AND NEW.store_id IS NOT NULL THEN
    INSERT INTO public.supplier_ledger (
      supplier_id,
      store_id,
      transaction_type,
      debit_amount,
      credit_amount,
      invoice_number,
      payment_reference,
      description,
      transaction_date
    ) VALUES (
      NEW.supplier_id,
      NEW.store_id,
      'material_purchase',
      NEW.total_cost,
      0,
      NEW.invoice_number,
      NULL,
      'Material purchase - ' || (SELECT name FROM public.materials WHERE id = NEW.material_id),
      COALESCE(NEW.date, CURRENT_DATE)
    );
  END IF;

  RETURN NEW;
END;
$function$;