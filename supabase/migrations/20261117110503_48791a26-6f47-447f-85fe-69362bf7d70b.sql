ALTER FUNCTION public.reverse_sales_stock_deduction() SET search_path = '';
ALTER FUNCTION public.get_fin_account_balance(uuid) SET search_path = '';
ALTER FUNCTION public.deduct_item_stock_on_sale() SET search_path = '';
ALTER FUNCTION public.delete_fin_transaction_atomic(uuid) SET search_path = '';
ALTER FUNCTION public.create_fin_transaction_atomic(text, bigint, uuid, date, text, jsonb) SET search_path = '';
ALTER FUNCTION public.reverse_sale_stock() SET search_path = '';
ALTER FUNCTION public.check_variant_aware_low_stock() SET search_path = '';
ALTER FUNCTION public.sync_payments_to_sales_order() SET search_path = '';
ALTER FUNCTION public.handle_sales_stock_deduction() SET search_path = '';
ALTER FUNCTION public.sync_payment_to_customer_ledger() SET search_path = '';
ALTER FUNCTION public.sync_customer_to_crm() SET search_path = '';

DROP POLICY IF EXISTS "Authenticated users can read financial_years" ON public.financial_years;
CREATE POLICY "Approved store users can read financial years"
  ON public.financial_years
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read categories" ON public.categories;
CREATE POLICY "Approved store users can read categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view labor categories" ON public.labor_categories;
CREATE POLICY "Approved store users can read labor categories"
  ON public.labor_categories
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users view product catalog" ON public.product_catalog;
CREATE POLICY "Approved store users can read product catalog"
  ON public.product_catalog
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid()));