-- Fix the trigger to use allowed transaction_type value 'purchase'
CREATE OR REPLACE FUNCTION public.create_supplier_ledger_entry_for_material_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create supplier ledger entry if supplier_id and store_id are provided
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
      'purchase',  -- Use 'purchase' as per CHECK constraint
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