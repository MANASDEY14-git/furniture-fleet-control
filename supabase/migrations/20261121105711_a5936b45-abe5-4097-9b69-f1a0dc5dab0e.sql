-- Correct SECURITY DEFINER caller checks that were bypassed because current_user
-- is the function owner. Keep the existing service-role path for trusted edge calls.
DO $fix_definer_guards$
DECLARE
  r record;
  v_definition text;
  v_fixed text;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'ai_get_cash_position', 'ai_get_deliveries', 'ai_get_followups',
        'ai_get_payables', 'ai_get_receivables', 'ai_get_sales_summary',
        'ai_get_stock_status', 'get_dispatch_board', 'get_followup_worklist',
        'get_receivables_aging', 'get_reorder_intelligence'
      ])
      AND p.prosrc ILIKE '%current_user <> ''postgres''%'
  LOOP
    v_definition := pg_get_functiondef(r.oid);
    v_fixed := regexp_replace(
      v_definition,
      E'\\s+AND\\s+current_user\\s*<>\\s*''postgres''',
      '',
      'gi'
    );
    IF v_fixed = v_definition THEN
      RAISE EXCEPTION 'Could not repair caller check for function %', r.oid::regprocedure;
    END IF;
    EXECUTE v_fixed;
  END LOOP;
END;
$fix_definer_guards$;

-- Global jobs change records across stores, so only a trusted service, database
-- owner, or platform-wide admin may invoke them.
DO $guard_global_jobs$
DECLARE
  r record;
  v_definition text;
  v_guard text := '  IF session_user <> ''postgres'' AND COALESCE(auth.role(), '''') <> ''service_role'' AND NOT public.has_role(auth.uid(), ''admin''::public.app_role) THEN' || chr(10) || '    RAISE EXCEPTION ''Administrative access required'';' || chr(10) || '  END IF;' || chr(10);
  v_start integer;
  v_after integer;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'close_and_rollover_financial_year', 'generate_ai_insights',
        'calculate_daily_kpis_and_scores', 'scan_operational_risks'
      ])
  LOOP
    v_definition := pg_get_functiondef(r.oid);
    v_start := strpos(v_definition, chr(13) || chr(10) || 'BEGIN' || chr(13) || chr(10));
    IF v_start > 0 THEN
      v_after := v_start + length(chr(13) || chr(10) || 'BEGIN' || chr(13) || chr(10)) - 1;
    ELSE
      v_start := strpos(v_definition, chr(10) || 'BEGIN' || chr(10));
      IF v_start = 0 THEN
        RAISE EXCEPTION 'Could not add administrator guard to %', r.proname;
      END IF;
      v_after := v_start + length(chr(10) || 'BEGIN' || chr(10)) - 1;
    END IF;
    v_definition := substr(v_definition, 1, v_after) || v_guard || substr(v_definition, v_after + 1);
    EXECUTE v_definition;
  END LOOP;
END;
$guard_global_jobs$;

-- Prevent caller-supplied user IDs from being used to obtain another user's PII.
DO $guard_sales_orders_secure$
DECLARE
  v_oid oid;
  v_definition text;
  v_guard text := '  IF session_user <> ''postgres'' AND COALESCE(auth.role(), '''') <> ''service_role'' THEN' || chr(10) || '    IF auth.uid() IS NULL THEN' || chr(10) || '      RAISE EXCEPTION ''Authentication required'';' || chr(10) || '    END IF;' || chr(10) || '    IF _user_id IS DISTINCT FROM auth.uid() THEN' || chr(10) || '      RAISE EXCEPTION ''Access denied for another user'';' || chr(10) || '    END IF;' || chr(10) || '    IF _store_id IS NULL THEN' || chr(10) || '      IF NOT public.has_role(auth.uid(), ''admin''::public.app_role) THEN' || chr(10) || '        RAISE EXCEPTION ''A store is required'';' || chr(10) || '      END IF;' || chr(10) || '    ELSIF NOT public.user_has_store_access(_store_id) THEN' || chr(10) || '      RAISE EXCEPTION ''Access denied for this store'';' || chr(10) || '    END IF;' || chr(10) || '  END IF;' || chr(10);
  v_start integer;
  v_after integer;
BEGIN
  SELECT p.oid INTO v_oid
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_sales_orders_secure'
  LIMIT 1;
  IF v_oid IS NULL THEN RAISE EXCEPTION 'get_sales_orders_secure was not found'; END IF;
  v_definition := pg_get_functiondef(v_oid);
  IF position('Access denied for another user' IN v_definition) > 0 THEN
    RAISE NOTICE 'get_sales_orders_secure guard already exists';
  ELSE
    v_start := strpos(v_definition, chr(13) || chr(10) || 'BEGIN' || chr(13) || chr(10));
    IF v_start > 0 THEN
      v_after := v_start + length(chr(13) || chr(10) || 'BEGIN' || chr(13) || chr(10)) - 1;
    ELSE
      v_start := strpos(v_definition, chr(10) || 'BEGIN' || chr(10));
      IF v_start = 0 THEN RAISE EXCEPTION 'Could not add caller guard to get_sales_orders_secure'; END IF;
      v_after := v_start + length(chr(10) || 'BEGIN' || chr(10)) - 1;
    END IF;
    v_definition := substr(v_definition, 1, v_after) || v_guard || substr(v_definition, v_after + 1);
    EXECUTE v_definition;
  END IF;
END;
$guard_sales_orders_secure$;

-- Material stock changes are limited to assigned admins and managers.
CREATE OR REPLACE FUNCTION public.adjust_material_stock(
  p_material_id uuid,
  p_quantity_change numeric,
  p_adjustment_type text,
  p_notes text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_qty numeric;
  material_name text;
  material_store_id uuid;
BEGIN
  IF session_user <> 'postgres' AND COALESCE(auth.role(), '') <> 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
            OR public.has_role(auth.uid(), 'manager'::public.app_role)) THEN
      RAISE EXCEPTION 'Admin or manager role required';
    END IF;
  END IF;

  SELECT m.quantity_available, m.name, m.store_id
  INTO current_qty, material_name, material_store_id
  FROM public.materials m
  WHERE m.id = p_material_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Material not found';
  END IF;

  IF session_user <> 'postgres' AND COALESCE(auth.role(), '') <> 'service_role' THEN
    IF material_store_id IS NULL THEN
      IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Access denied for this material';
      END IF;
    ELSIF NOT public.user_has_store_access(material_store_id) THEN
      RAISE EXCEPTION 'Access denied for this store';
    END IF;
  END IF;

  IF COALESCE(current_qty, 0) + p_quantity_change < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in negative stock for material "%". Current: %, Change: %',
      material_name, COALESCE(current_qty, 0), p_quantity_change;
  END IF;

  UPDATE public.materials
  SET quantity_available = quantity_available + p_quantity_change,
      updated_at = now()
  WHERE id = p_material_id;

  INSERT INTO public.material_stock_movements (
    material_id, movement_type, quantity_change, reference_type, notes
  ) VALUES (
    p_material_id,
    p_adjustment_type,
    p_quantity_change,
    'manual_adjustment',
    COALESCE(p_notes, 'Stock adjustment: ' || p_adjustment_type)
  );
END;
$function$;

-- Trigger-only and internal processing functions are not direct client RPCs.
ALTER FUNCTION public.create_supplier_ledger_entry_for_material_purchase() SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.get_digest_recipients(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.perform_year_end_closing(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_system_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_supplier_ledger_entry_for_material_purchase() FROM PUBLIC, anon, authenticated;

-- The active financial year contains shared calendar dates, not store records.
-- Run its query under the caller's RLS context rather than bypassing RLS.
ALTER FUNCTION public.get_active_financial_year() SECURITY INVOKER;

-- Remove direct anonymous execution from every selected protected-data RPC.
DO $revoke_public_rpc$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'adjust_material_stock', 'ai_get_cash_position', 'ai_get_deliveries',
        'ai_get_followups', 'ai_get_payables', 'ai_get_receivables',
        'ai_get_sales_summary', 'ai_get_stock_status',
        'calculate_daily_kpis_and_scores', 'cancel_sales_order',
        'close_and_rollover_financial_year', 'create_supplier_ledger_entry_for_material_purchase',
        'customer_summary', 'generate_ai_insights', 'get_active_financial_year',
        'get_customer_money_summary', 'get_digest_recipients', 'get_dispatch_board',
        'get_followup_worklist', 'get_inventory_intelligence', 'get_receivables_aging',
        'get_reorder_intelligence', 'get_sales_intelligence_summary',
        'get_sales_orders_for_user', 'get_sales_orders_secure',
        'modify_sales_order_line', 'perform_year_end_closing',
        'process_system_events', 'scan_operational_risks'
      ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.oid::regprocedure);
  END LOOP;
END;
$revoke_public_rpc$;

-- The double-entry chart is shared reference data; ledger records are visible
-- only in stores the signed-in user can access. Users cannot edit these tables
-- directly; application posting remains through the existing posting flow.
DROP POLICY IF EXISTS "Allow read access to chart_of_accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Allow write to chart_of_accounts" ON public.chart_of_accounts;
CREATE POLICY "Signed-in users can read chart of accounts"
  ON public.chart_of_accounts FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow read access to journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Allow write to journal_entries" ON public.journal_entries;
CREATE POLICY "Store members can read their journal entries"
  ON public.journal_entries FOR SELECT TO authenticated
  USING (store_id IS NOT NULL AND public.user_has_store_access(store_id));

DROP POLICY IF EXISTS "Allow read access to journal_entry_lines" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Allow write to journal_entry_lines" ON public.journal_entry_lines;
CREATE POLICY "Store members can read their journal entry lines"
  ON public.journal_entry_lines FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.journal_entries je
    WHERE je.id = journal_entry_id
      AND je.store_id IS NOT NULL
      AND public.user_has_store_access(je.store_id)
  ));

-- Bank account balances are financial records, so only designated financial
-- roles may create, edit, or deactivate them.
DROP POLICY IF EXISTS "Users can access bank accounts for their stores" ON public.bank_accounts;
CREATE POLICY "Store members can view bank accounts"
  ON public.bank_accounts FOR SELECT TO authenticated
  USING (public.user_has_store_access(store_id));
CREATE POLICY "Financial roles can create bank accounts"
  ON public.bank_accounts FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_store_access(store_id)
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
      OR public.has_role(auth.uid(), 'accountant'::public.app_role))
  );
CREATE POLICY "Financial roles can update bank accounts"
  ON public.bank_accounts FOR UPDATE TO authenticated
  USING (
    public.user_has_store_access(store_id)
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
      OR public.has_role(auth.uid(), 'accountant'::public.app_role))
  )
  WITH CHECK (
    public.user_has_store_access(store_id)
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
      OR public.has_role(auth.uid(), 'accountant'::public.app_role))
  );
CREATE POLICY "Financial roles can delete bank accounts"
  ON public.bank_accounts FOR DELETE TO authenticated
  USING (
    public.user_has_store_access(store_id)
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
      OR public.has_role(auth.uid(), 'accountant'::public.app_role))
  );

-- Item photos remain publicly downloadable, but the storage API only lists
-- files in folders belonging to stores the caller is assigned to.
DROP POLICY IF EXISTS "Anyone can view item images" ON storage.objects;
CREATE POLICY "Store users can list item images for their stores"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'item-images'
    AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND public.user_has_store_access(((storage.foldername(name))[1])::uuid)
  );