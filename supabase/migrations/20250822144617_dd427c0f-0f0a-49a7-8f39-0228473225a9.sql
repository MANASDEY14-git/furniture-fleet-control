-- Fix Material Purchase and Supplier Ledger Issues

-- 1. Create function to handle supplier ledger entry for material purchases
CREATE OR REPLACE FUNCTION public.create_supplier_ledger_entry_for_material_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Only create supplier ledger entry if supplier_id is provided
  IF NEW.supplier_id IS NOT NULL THEN
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
      'purchase',
      NEW.total_cost,
      0,
      NEW.invoice_number,
      NULL,
      'Material purchase - ' || (SELECT name FROM materials WHERE id = NEW.material_id),
      NEW.date
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Drop any existing duplicate triggers on material_purchases
DROP TRIGGER IF EXISTS trigger_update_material_stock_on_purchase ON public.material_purchases;
DROP TRIGGER IF EXISTS material_purchase_stock_update ON public.material_purchases;
DROP TRIGGER IF EXISTS update_material_stock_trigger ON public.material_purchases;

-- 3. Create the correct triggers for material_purchases
CREATE TRIGGER trigger_update_material_stock_on_purchase
  AFTER INSERT ON public.material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_material_stock_on_purchase();

CREATE TRIGGER trigger_create_supplier_ledger_entry_for_material_purchase
  AFTER INSERT ON public.material_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.create_supplier_ledger_entry_for_material_purchase();

-- 4. Clean up duplicate material stock movements
DELETE FROM public.material_stock_movements 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (
             PARTITION BY material_id, movement_type, quantity_change, reference_type, reference_id, created_at::date 
             ORDER BY created_at
           ) as row_num
    FROM public.material_stock_movements
    WHERE movement_type = 'purchase'
  ) t
  WHERE t.row_num > 1
);

-- 5. Backfill missing supplier ledger entries for existing material purchases
INSERT INTO public.supplier_ledger (
  supplier_id,
  store_id,
  transaction_type,
  debit_amount,
  credit_amount,
  invoice_number,
  description,
  transaction_date
)
SELECT DISTINCT
  mp.supplier_id,
  mp.store_id,
  'purchase'::text,
  mp.total_cost,
  0,
  mp.invoice_number,
  'Material purchase - ' || m.name || ' (backfilled)',
  mp.date
FROM public.material_purchases mp
JOIN public.materials m ON m.id = mp.material_id
WHERE mp.supplier_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.supplier_ledger sl
    WHERE sl.supplier_id = mp.supplier_id
      AND sl.transaction_type = 'purchase'
      AND sl.debit_amount = mp.total_cost
      AND sl.transaction_date = mp.date
      AND sl.invoice_number = mp.invoice_number
  );