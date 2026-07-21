-- 1. Create a trigger to automatically update customer_ledger on sales_order changes
CREATE OR REPLACE FUNCTION public.sync_sales_order_to_customer_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only process for actual orders (not quotes) that have a customer assigned
  IF NEW.document_type = 'order' AND NEW.customer_id IS NOT NULL THEN
    
    -- Check if a ledger entry already exists for this order
    IF EXISTS (SELECT 1 FROM public.customer_ledger WHERE reference_type = 'sales_order' AND reference_id = NEW.id) THEN
      -- Update existing entry
      UPDATE public.customer_ledger
      SET 
        debit_amount = NEW.total_amount,
        transaction_date = COALESCE(NEW.date::date, CURRENT_DATE),
        store_id = NEW.store_id
      WHERE reference_type = 'sales_order' AND reference_id = NEW.id;
    ELSE
      -- Insert new entry
      INSERT INTO public.customer_ledger (
        customer_id,
        store_id,
        transaction_type,
        debit_amount,
        credit_amount,
        reference_type,
        reference_id,
        transaction_date,
        notes
      ) VALUES (
        NEW.customer_id,
        NEW.store_id,
        'sale',
        NEW.total_amount,
        0,
        'sales_order',
        NEW.id,
        COALESCE(NEW.date::date, CURRENT_DATE),
        'Sales Order ' || COALESCE(NEW.order_number, '')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_sales_order_customer_ledger_trigger ON public.sales_orders;
CREATE TRIGGER sync_sales_order_customer_ledger_trigger
AFTER INSERT OR UPDATE OF total_amount, document_type, customer_id ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_sales_order_to_customer_ledger();

-- 2. Create a trigger to automatically update customer_ledger on payment changes
CREATE OR REPLACE FUNCTION public.sync_payment_to_customer_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _customer_id uuid;
BEGIN
  -- Only handle receipts (payments from customers), not supplier payments
  IF NEW.type = 'Receipt' AND NEW.reference_type = 'sales_order' AND NEW.sale_id IS NOT NULL THEN
    -- Get the customer_id from the linked sales order
    SELECT customer_id INTO _customer_id FROM public.sales_orders WHERE id = NEW.sale_id;
    
    IF _customer_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.customer_ledger WHERE reference_type = 'payment' AND reference_id = NEW.id) THEN
        -- Update existing entry
        UPDATE public.customer_ledger
        SET 
          credit_amount = NEW.amount,
          transaction_date = COALESCE(NEW.date::date, CURRENT_DATE),
          store_id = NEW.store_id
        WHERE reference_type = 'payment' AND reference_id = NEW.id;
      ELSE
        -- Insert new entry
        INSERT INTO public.customer_ledger (
          customer_id,
          store_id,
          transaction_type,
          debit_amount,
          credit_amount,
          reference_type,
          reference_id,
          transaction_date,
          notes
        ) VALUES (
          _customer_id,
          NEW.store_id,
          'payment',
          0,
          NEW.amount,
          'payment',
          NEW.id,
          COALESCE(NEW.date::date, CURRENT_DATE),
          'Payment ' || COALESCE(NEW.description, '')
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_payment_customer_ledger_trigger ON public.payments;
CREATE TRIGGER sync_payment_customer_ledger_trigger
AFTER INSERT OR UPDATE OF amount, sale_id ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_payment_to_customer_ledger();

-- 3. Data Migration Block (Backfill existing data safely)
DO $$
DECLARE
  r RECORD;
  new_customer_id uuid;
BEGIN
  -- 3a. Create customers for existing sales orders
  FOR r IN 
    SELECT DISTINCT ON (store_id, customer_name, customer_phone)
      store_id, customer_name, customer_phone, customer_address
    FROM public.sales_orders
    WHERE customer_id IS NULL AND customer_name IS NOT NULL AND customer_name != ''
  LOOP
    -- check if customer already exists (to be safe)
    SELECT id INTO new_customer_id FROM public.customers 
    WHERE store_id = r.store_id AND name = r.customer_name 
      AND (phone = r.customer_phone OR (phone IS NULL AND r.customer_phone IS NULL))
    LIMIT 1;
    
    IF new_customer_id IS NULL THEN
      INSERT INTO public.customers (store_id, name, phone, address)
      VALUES (r.store_id, r.customer_name, r.customer_phone, r.customer_address)
      RETURNING id INTO new_customer_id;
    END IF;
    
    -- Update the sales orders to link to this new or existing customer
    UPDATE public.sales_orders 
    SET customer_id = new_customer_id
    WHERE store_id = r.store_id 
      AND customer_name = r.customer_name 
      AND (customer_phone = r.customer_phone OR (customer_phone IS NULL AND r.customer_phone IS NULL))
      AND customer_id IS NULL;
      
  END LOOP;
  
  -- 3b. Backfill ledger for orders
  INSERT INTO public.customer_ledger (
    customer_id, store_id, transaction_type, debit_amount, credit_amount,
    reference_type, reference_id, transaction_date, notes
  )
  SELECT 
    customer_id, store_id, 'sale', total_amount, 0,
    'sales_order', id, COALESCE(date::date, CURRENT_DATE), 'Sales Order ' || COALESCE(order_number, '')
  FROM public.sales_orders
  WHERE customer_id IS NOT NULL AND document_type = 'order'
  AND id NOT IN (SELECT reference_id FROM public.customer_ledger WHERE reference_type = 'sales_order');

  -- 3c. Backfill ledger for payments
  INSERT INTO public.customer_ledger (
    customer_id, store_id, transaction_type, debit_amount, credit_amount,
    reference_type, reference_id, transaction_date, notes
  )
  SELECT 
    so.customer_id, p.store_id, 'payment', 0, p.amount,
    'payment', p.id, COALESCE(p.date::date, CURRENT_DATE), 'Payment ' || COALESCE(p.description, '')
  FROM public.payments p
  JOIN public.sales_orders so ON so.id = p.sale_id
  WHERE p.type = 'Receipt' AND p.reference_type = 'sales_order' AND so.customer_id IS NOT NULL
  AND p.id NOT IN (SELECT reference_id FROM public.customer_ledger WHERE reference_type = 'payment');
  
END $$;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
