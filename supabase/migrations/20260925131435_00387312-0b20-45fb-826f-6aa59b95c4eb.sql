CREATE TABLE public.store_transfer_settings (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  godown_code text NOT NULL,
  challan_prefix text NOT NULL DEFAULT 'ST',
  address text,
  contact_person text,
  phone text,
  external_document_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_transfer_settings_code_format CHECK (godown_code ~ '^[A-Z0-9-]{2,12}$'),
  CONSTRAINT store_transfer_settings_prefix_format CHECK (challan_prefix ~ '^[A-Z0-9-]{1,8}$')
);
GRANT SELECT, INSERT, UPDATE ON public.store_transfer_settings TO authenticated;
GRANT ALL ON public.store_transfer_settings TO service_role;
ALTER TABLE public.store_transfer_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accessible users view transfer settings" ON public.store_transfer_settings FOR SELECT TO authenticated USING (public.user_has_store_access(store_id));
CREATE POLICY "Managers maintain transfer settings" ON public.store_transfer_settings FOR INSERT TO authenticated WITH CHECK (public.user_has_store_access(store_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));
CREATE POLICY "Managers update transfer settings" ON public.store_transfer_settings FOR UPDATE TO authenticated USING (public.user_has_store_access(store_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))) WITH CHECK (public.user_has_store_access(store_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

CREATE TABLE public.product_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'pcs',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.product_catalog TO authenticated;
GRANT ALL ON public.product_catalog TO service_role;
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view product catalog" ON public.product_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers create catalog products" ON public.product_catalog FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) AND created_by = auth.uid());
CREATE POLICY "Managers update catalog products" ON public.product_catalog FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE TABLE public.store_product_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.product_catalog(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.item_variants(id) ON DELETE CASCADE,
  approved_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, store_id, variant_id),
  UNIQUE (store_id, item_id, variant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_product_items TO authenticated;
GRANT ALL ON public.store_product_items TO service_role;
ALTER TABLE public.store_product_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accessible users view product mappings" ON public.store_product_items FOR SELECT TO authenticated USING (public.user_has_store_access(store_id));
CREATE POLICY "Managers create product mappings" ON public.store_product_items FOR INSERT TO authenticated WITH CHECK (public.user_has_store_access(store_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')) AND approved_by = auth.uid());
CREATE POLICY "Managers update product mappings" ON public.store_product_items FOR UPDATE TO authenticated USING (public.user_has_store_access(store_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))) WITH CHECK (public.user_has_store_access(store_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));
CREATE POLICY "Managers delete product mappings" ON public.store_product_items FOR DELETE TO authenticated USING (public.user_has_store_access(store_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

CREATE TABLE public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_store_id uuid NOT NULL REFERENCES public.stores(id),
  destination_store_id uuid NOT NULL REFERENCES public.stores(id),
  status text NOT NULL DEFAULT 'draft',
  draft_reference text NOT NULL UNIQUE DEFAULT ('DRAFT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  challan_number text UNIQUE,
  challan_sequence integer,
  financial_year_id uuid REFERENCES public.financial_years(id),
  transfer_reason text NOT NULL,
  planned_dispatch_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_arrival_date date,
  dispatched_at timestamptz,
  completed_at timestamptz,
  transporter_name text,
  vehicle_number text,
  lr_number text,
  external_document_reference text,
  notes text,
  total_quantity numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  source_snapshot jsonb,
  destination_snapshot jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  dispatched_by uuid,
  completed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_transfers_distinct_stores CHECK (source_store_id <> destination_store_id),
  CONSTRAINT stock_transfers_status_valid CHECK (status IN ('draft','in_transit','partially_received','received','received_with_discrepancy','cancelled')),
  CONSTRAINT stock_transfers_totals_valid CHECK (total_quantity >= 0 AND total_value >= 0)
);
GRANT SELECT ON public.stock_transfers TO authenticated;
GRANT ALL ON public.stock_transfers TO service_role;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view accessible transfers" ON public.stock_transfers FOR SELECT TO authenticated USING (public.user_has_store_access(source_store_id) OR public.user_has_store_access(destination_store_id));

CREATE TABLE public.stock_transfer_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  source_item_id uuid NOT NULL REFERENCES public.items(id),
  destination_item_id uuid NOT NULL REFERENCES public.items(id),
  source_variant_id uuid REFERENCES public.item_variants(id),
  destination_variant_id uuid REFERENCES public.item_variants(id),
  product_id uuid REFERENCES public.product_catalog(id),
  item_name_snapshot text NOT NULL,
  unit_snapshot text NOT NULL DEFAULT 'pcs',
  quantity_dispatched numeric NOT NULL,
  unit_transfer_price numeric NOT NULL,
  line_value numeric GENERATED ALWAYS AS (quantity_dispatched * unit_transfer_price) STORED,
  quantity_received numeric NOT NULL DEFAULT 0,
  quantity_damaged numeric NOT NULL DEFAULT 0,
  quantity_short numeric NOT NULL DEFAULT 0,
  condition_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stock_transfer_lines_quantity_positive CHECK (quantity_dispatched > 0),
  CONSTRAINT stock_transfer_lines_price_positive CHECK (unit_transfer_price > 0),
  CONSTRAINT stock_transfer_lines_received_valid CHECK (quantity_received >= 0 AND quantity_damaged >= 0 AND quantity_short >= 0 AND quantity_received + quantity_damaged + quantity_short <= quantity_dispatched)
);
GRANT SELECT ON public.stock_transfer_lines TO authenticated;
GRANT ALL ON public.stock_transfer_lines TO service_role;
ALTER TABLE public.stock_transfer_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view accessible transfer lines" ON public.stock_transfer_lines FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stock_transfers st WHERE st.id = transfer_id AND (public.user_has_store_access(st.source_store_id) OR public.user_has_store_access(st.destination_store_id))));

CREATE TABLE public.stock_transfer_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id),
  receipt_number text NOT NULL UNIQUE,
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid NOT NULL DEFAULT auth.uid(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stock_transfer_receipts TO authenticated;
GRANT ALL ON public.stock_transfer_receipts TO service_role;
ALTER TABLE public.stock_transfer_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view accessible transfer receipts" ON public.stock_transfer_receipts FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stock_transfers st WHERE st.id = transfer_id AND (public.user_has_store_access(st.source_store_id) OR public.user_has_store_access(st.destination_store_id))));

CREATE TABLE public.stock_transfer_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.stock_transfer_receipts(id) ON DELETE CASCADE,
  transfer_line_id uuid NOT NULL REFERENCES public.stock_transfer_lines(id),
  quantity_received numeric NOT NULL DEFAULT 0,
  quantity_damaged numeric NOT NULL DEFAULT 0,
  quantity_short numeric NOT NULL DEFAULT 0,
  discrepancy_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receipt_line_quantity_valid CHECK (quantity_received >= 0 AND quantity_damaged >= 0 AND quantity_short >= 0 AND quantity_received + quantity_damaged + quantity_short > 0)
);
GRANT SELECT ON public.stock_transfer_receipt_lines TO authenticated;
GRANT ALL ON public.stock_transfer_receipt_lines TO service_role;
ALTER TABLE public.stock_transfer_receipt_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view accessible receipt lines" ON public.stock_transfer_receipt_lines FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stock_transfer_receipts sr JOIN public.stock_transfers st ON st.id = sr.transfer_id WHERE sr.id = receipt_id AND (public.user_has_store_access(st.source_store_id) OR public.user_has_store_access(st.destination_store_id))));

CREATE TABLE public.stock_transfer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id),
  event_type text NOT NULL,
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stock_transfer_events TO authenticated;
GRANT ALL ON public.stock_transfer_events TO service_role;
ALTER TABLE public.stock_transfer_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view accessible transfer events" ON public.stock_transfer_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stock_transfers st WHERE st.id = transfer_id AND (public.user_has_store_access(st.source_store_id) OR public.user_has_store_access(st.destination_store_id))));

CREATE TABLE public.challan_sequences (
  source_store_id uuid NOT NULL REFERENCES public.stores(id),
  financial_year_id uuid NOT NULL REFERENCES public.financial_years(id),
  last_sequence integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_store_id, financial_year_id)
);
GRANT ALL ON public.challan_sequences TO service_role;
ALTER TABLE public.challan_sequences ENABLE ROW LEVEL SECURITY;

CREATE INDEX stock_transfers_source_status_idx ON public.stock_transfers(source_store_id, status, created_at DESC);
CREATE INDEX stock_transfers_destination_status_idx ON public.stock_transfers(destination_store_id, status, created_at DESC);
CREATE INDEX stock_transfer_lines_transfer_idx ON public.stock_transfer_lines(transfer_id);
CREATE INDEX stock_transfer_receipts_transfer_idx ON public.stock_transfer_receipts(transfer_id);
CREATE INDEX stock_transfer_events_transfer_idx ON public.stock_transfer_events(transfer_id, created_at);

CREATE TRIGGER update_store_transfer_settings_updated_at BEFORE UPDATE ON public.store_transfer_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_product_catalog_updated_at BEFORE UPDATE ON public.product_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.create_stock_transfer_draft(
  _source_store_id uuid,
  _destination_store_id uuid,
  _transfer_reason text,
  _planned_dispatch_date date,
  _expected_arrival_date date,
  _transporter_name text,
  _vehicle_number text,
  _lr_number text,
  _external_document_reference text,
  _notes text,
  _lines jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_transfer_id uuid;
  v_line jsonb;
  v_source_item public.items%ROWTYPE;
  v_destination_item public.items%ROWTYPE;
  v_qty numeric;
  v_price numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT (public.has_role(v_user, 'admin') OR public.has_role(v_user, 'manager')) THEN RAISE EXCEPTION 'Manager access required'; END IF;
  IF NOT public.user_has_store_access(_source_store_id) THEN RAISE EXCEPTION 'No access to source godown'; END IF;
  IF _source_store_id = _destination_store_id THEN RAISE EXCEPTION 'Source and destination must differ'; END IF;
  IF NOT public.user_has_store_access(_destination_store_id) THEN RAISE EXCEPTION 'No access to destination godown'; END IF;
  IF trim(COALESCE(_transfer_reason, '')) = '' THEN RAISE EXCEPTION 'Transfer reason is required'; END IF;
  IF _lines IS NULL OR jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) = 0 THEN RAISE EXCEPTION 'At least one transfer line is required'; END IF;
  IF EXISTS (SELECT 1 FROM public.financial_years WHERE is_closed AND _planned_dispatch_date BETWEEN start_date AND end_date) THEN RAISE EXCEPTION 'Cannot create a transfer in a closed financial year'; END IF;

  INSERT INTO public.stock_transfers (source_store_id, destination_store_id, transfer_reason, planned_dispatch_date, expected_arrival_date, transporter_name, vehicle_number, lr_number, external_document_reference, notes, created_by)
  VALUES (_source_store_id, _destination_store_id, trim(_transfer_reason), COALESCE(_planned_dispatch_date, CURRENT_DATE), _expected_arrival_date, nullif(trim(_transporter_name), ''), nullif(trim(_vehicle_number), ''), nullif(trim(_lr_number), ''), nullif(trim(_external_document_reference), ''), nullif(trim(_notes), ''), v_user)
  RETURNING id INTO v_transfer_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(_lines)
  LOOP
    v_qty := (v_line->>'quantity')::numeric;
    v_price := (v_line->>'unit_transfer_price')::numeric;
    IF v_qty <= 0 OR v_price <= 0 THEN RAISE EXCEPTION 'Quantity and transfer price must be positive'; END IF;

    SELECT * INTO v_source_item FROM public.items WHERE id = (v_line->>'source_item_id')::uuid AND store_id = _source_store_id AND NOT is_discontinued;
    IF NOT FOUND THEN RAISE EXCEPTION 'Source item is invalid'; END IF;
    SELECT * INTO v_destination_item FROM public.items WHERE id = (v_line->>'destination_item_id')::uuid AND store_id = _destination_store_id AND NOT is_discontinued;
    IF NOT FOUND THEN RAISE EXCEPTION 'Destination item is invalid'; END IF;

    INSERT INTO public.stock_transfer_lines (transfer_id, source_item_id, destination_item_id, source_variant_id, destination_variant_id, product_id, item_name_snapshot, quantity_dispatched, unit_transfer_price, condition_note)
    VALUES (v_transfer_id, v_source_item.id, v_destination_item.id, nullif(v_line->>'source_variant_id', '')::uuid, nullif(v_line->>'destination_variant_id', '')::uuid, nullif(v_line->>'product_id', '')::uuid, v_source_item.name, v_qty, v_price, nullif(trim(v_line->>'condition_note'), ''));
  END LOOP;

  UPDATE public.stock_transfers st SET
    total_quantity = x.qty,
    total_value = x.val
  FROM (SELECT transfer_id, sum(quantity_dispatched) qty, sum(line_value) val FROM public.stock_transfer_lines WHERE transfer_id = v_transfer_id GROUP BY transfer_id) x
  WHERE st.id = x.transfer_id;

  INSERT INTO public.stock_transfer_events (transfer_id, event_type, actor_id, details) VALUES (v_transfer_id, 'draft_created', v_user, jsonb_build_object('line_count', jsonb_array_length(_lines)));
  RETURN v_transfer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_stock_transfer(_transfer_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_transfer public.stock_transfers%ROWTYPE;
  v_fy public.financial_years%ROWTYPE;
  v_settings public.store_transfer_settings%ROWTYPE;
  v_line public.stock_transfer_lines%ROWTYPE;
  v_seq integer;
  v_challan text;
  v_source jsonb;
  v_destination jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = _transfer_id FOR UPDATE;
  IF NOT FOUND OR v_transfer.status <> 'draft' THEN RAISE EXCEPTION 'Only a draft transfer can be dispatched'; END IF;
  IF NOT public.user_has_store_access(v_transfer.source_store_id) OR NOT (public.has_role(v_user, 'admin') OR public.has_role(v_user, 'manager')) THEN RAISE EXCEPTION 'Source manager access required'; END IF;
  SELECT * INTO v_fy FROM public.financial_years WHERE v_transfer.planned_dispatch_date BETWEEN start_date AND end_date ORDER BY start_date DESC LIMIT 1;
  IF NOT FOUND OR v_fy.is_closed THEN RAISE EXCEPTION 'An open financial year is required'; END IF;
  SELECT * INTO v_settings FROM public.store_transfer_settings WHERE store_id = v_transfer.source_store_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Configure source godown challan settings before dispatch'; END IF;
  SELECT jsonb_build_object('name', s.name, 'location', s.location, 'address', v_settings.address, 'contact_person', v_settings.contact_person, 'phone', v_settings.phone, 'godown_code', v_settings.godown_code) INTO v_source FROM public.stores s WHERE s.id = v_transfer.source_store_id;
  SELECT jsonb_build_object('name', s.name, 'location', s.location, 'address', d.address, 'contact_person', d.contact_person, 'phone', d.phone, 'godown_code', d.godown_code) INTO v_destination FROM public.stores s LEFT JOIN public.store_transfer_settings d ON d.store_id = s.id WHERE s.id = v_transfer.destination_store_id;

  FOR v_line IN SELECT * FROM public.stock_transfer_lines WHERE transfer_id = _transfer_id ORDER BY id
  LOOP
    IF v_line.source_variant_id IS NULL THEN
      UPDATE public.items SET quantity_available = quantity_available - v_line.quantity_dispatched, updated_at = now() WHERE id = v_line.source_item_id AND store_id = v_transfer.source_store_id AND quantity_available >= v_line.quantity_dispatched;
    ELSE
      UPDATE public.item_variants SET quantity_available = quantity_available - v_line.quantity_dispatched, updated_at = now() WHERE id = v_line.source_variant_id AND parent_item_id = v_line.source_item_id AND quantity_available >= v_line.quantity_dispatched;
    END IF;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock for %', v_line.item_name_snapshot; END IF;
  END LOOP;

  INSERT INTO public.challan_sequences(source_store_id, financial_year_id, last_sequence) VALUES (v_transfer.source_store_id, v_fy.id, 1)
  ON CONFLICT (source_store_id, financial_year_id) DO UPDATE SET last_sequence = public.challan_sequences.last_sequence + 1, updated_at = now()
  RETURNING last_sequence INTO v_seq;
  v_challan := v_settings.godown_code || '/' || v_settings.challan_prefix || '/' || v_fy.label || '/' || lpad(v_seq::text, 6, '0');

  UPDATE public.stock_transfers SET status = 'in_transit', challan_number = v_challan, challan_sequence = v_seq, financial_year_id = v_fy.id, dispatched_at = now(), dispatched_by = v_user, source_snapshot = v_source, destination_snapshot = v_destination WHERE id = _transfer_id;
  INSERT INTO public.stock_transfer_events (transfer_id, event_type, actor_id, details) VALUES (_transfer_id, 'dispatched', v_user, jsonb_build_object('challan_number', v_challan, 'total_quantity', v_transfer.total_quantity, 'total_value', v_transfer.total_value));
  RETURN v_challan;
END;
$$;

CREATE OR REPLACE FUNCTION public.receive_stock_transfer(_transfer_id uuid, _notes text, _lines jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_transfer public.stock_transfers%ROWTYPE;
  v_receipt_id uuid;
  v_receipt_number text;
  v_input jsonb;
  v_line public.stock_transfer_lines%ROWTYPE;
  v_received numeric;
  v_damaged numeric;
  v_short numeric;
  v_remaining numeric;
  v_unresolved numeric;
  v_has_discrepancy boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = _transfer_id FOR UPDATE;
  IF NOT FOUND OR v_transfer.status NOT IN ('in_transit','partially_received') THEN RAISE EXCEPTION 'Transfer is not available to receive'; END IF;
  IF v_transfer.dispatched_by = v_user THEN RAISE EXCEPTION 'Dispatcher cannot receive the same transfer'; END IF;
  IF NOT public.user_has_store_access(v_transfer.destination_store_id) OR NOT (public.has_role(v_user, 'admin') OR public.has_role(v_user, 'manager')) THEN RAISE EXCEPTION 'Destination manager access required'; END IF;
  IF EXISTS (SELECT 1 FROM public.financial_years WHERE is_closed AND CURRENT_DATE BETWEEN start_date AND end_date) THEN RAISE EXCEPTION 'Cannot receive into a closed financial year'; END IF;
  IF _lines IS NULL OR jsonb_typeof(_lines) <> 'array' OR jsonb_array_length(_lines) = 0 THEN RAISE EXCEPTION 'At least one receipt line is required'; END IF;

  v_receipt_number := v_transfer.challan_number || '/GRN/' || lpad((SELECT count(*) + 1 FROM public.stock_transfer_receipts WHERE transfer_id = _transfer_id)::text, 2, '0');
  INSERT INTO public.stock_transfer_receipts(transfer_id, receipt_number, received_by, notes) VALUES (_transfer_id, v_receipt_number, v_user, nullif(trim(_notes), '')) RETURNING id INTO v_receipt_id;

  FOR v_input IN SELECT value FROM jsonb_array_elements(_lines)
  LOOP
    SELECT * INTO v_line FROM public.stock_transfer_lines WHERE id = (v_input->>'transfer_line_id')::uuid AND transfer_id = _transfer_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invalid transfer line'; END IF;
    v_received := COALESCE((v_input->>'quantity_received')::numeric, 0);
    v_damaged := COALESCE((v_input->>'quantity_damaged')::numeric, 0);
    v_short := COALESCE((v_input->>'quantity_short')::numeric, 0);
    v_remaining := v_line.quantity_dispatched - v_line.quantity_received - v_line.quantity_damaged - v_line.quantity_short;
    IF v_received < 0 OR v_damaged < 0 OR v_short < 0 OR v_received + v_damaged + v_short <= 0 OR v_received + v_damaged + v_short > v_remaining THEN RAISE EXCEPTION 'Receipt quantity exceeds remaining quantity for %', v_line.item_name_snapshot; END IF;
    IF (v_damaged > 0 OR v_short > 0) AND trim(COALESCE(v_input->>'discrepancy_note', '')) = '' THEN RAISE EXCEPTION 'A discrepancy note is required for damaged or short stock'; END IF;

    INSERT INTO public.stock_transfer_receipt_lines(receipt_id, transfer_line_id, quantity_received, quantity_damaged, quantity_short, discrepancy_note)
    VALUES (v_receipt_id, v_line.id, v_received, v_damaged, v_short, nullif(trim(v_input->>'discrepancy_note'), ''));

    IF v_received > 0 THEN
      IF v_line.destination_variant_id IS NULL THEN
        UPDATE public.items SET quantity_available = quantity_available + v_received, cost_price = v_line.unit_transfer_price, updated_at = now() WHERE id = v_line.destination_item_id AND store_id = v_transfer.destination_store_id;
      ELSE
        UPDATE public.item_variants SET quantity_available = quantity_available + v_received, cost_price = v_line.unit_transfer_price, updated_at = now() WHERE id = v_line.destination_variant_id AND parent_item_id = v_line.destination_item_id;
      END IF;
      IF NOT FOUND THEN RAISE EXCEPTION 'Destination item mapping is invalid for %', v_line.item_name_snapshot; END IF;
    END IF;

    UPDATE public.stock_transfer_lines SET quantity_received = quantity_received + v_received, quantity_damaged = quantity_damaged + v_damaged, quantity_short = quantity_short + v_short WHERE id = v_line.id;
  END LOOP;

  SELECT COALESCE(sum(quantity_dispatched - quantity_received - quantity_damaged - quantity_short), 0), COALESCE(bool_or(quantity_damaged > 0 OR quantity_short > 0), false)
  INTO v_unresolved, v_has_discrepancy FROM public.stock_transfer_lines WHERE transfer_id = _transfer_id;

  UPDATE public.stock_transfers SET status = CASE WHEN v_unresolved > 0 THEN 'partially_received' WHEN v_has_discrepancy THEN 'received_with_discrepancy' ELSE 'received' END, completed_at = CASE WHEN v_unresolved = 0 THEN now() ELSE NULL END, completed_by = CASE WHEN v_unresolved = 0 THEN v_user ELSE NULL END WHERE id = _transfer_id;
  INSERT INTO public.stock_transfer_events(transfer_id, event_type, actor_id, details) VALUES (_transfer_id, 'receipt_recorded', v_user, jsonb_build_object('receipt_id', v_receipt_id, 'receipt_number', v_receipt_number));
  RETURN v_receipt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_stock_transfer(_transfer_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_transfer public.stock_transfers%ROWTYPE;
  v_line public.stock_transfer_lines%ROWTYPE;
BEGIN
  IF v_user IS NULL OR NOT (public.has_role(v_user, 'admin') OR public.has_role(v_user, 'manager')) THEN RAISE EXCEPTION 'Manager access required'; END IF;
  IF trim(COALESCE(_reason, '')) = '' THEN RAISE EXCEPTION 'Cancellation reason is required'; END IF;
  SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = _transfer_id FOR UPDATE;
  IF NOT FOUND OR v_transfer.status NOT IN ('draft','in_transit') THEN RAISE EXCEPTION 'Only draft or wholly unreceived transfers can be cancelled'; END IF;
  IF NOT public.user_has_store_access(v_transfer.source_store_id) THEN RAISE EXCEPTION 'Source access required'; END IF;
  IF v_transfer.status = 'in_transit' THEN
    IF EXISTS (SELECT 1 FROM public.stock_transfer_lines WHERE transfer_id = _transfer_id AND (quantity_received + quantity_damaged + quantity_short) > 0) THEN RAISE EXCEPTION 'A received transfer cannot be cancelled'; END IF;
    FOR v_line IN SELECT * FROM public.stock_transfer_lines WHERE transfer_id = _transfer_id
    LOOP
      IF v_line.source_variant_id IS NULL THEN UPDATE public.items SET quantity_available = quantity_available + v_line.quantity_dispatched, updated_at = now() WHERE id = v_line.source_item_id; ELSE UPDATE public.item_variants SET quantity_available = quantity_available + v_line.quantity_dispatched, updated_at = now() WHERE id = v_line.source_variant_id; END IF;
    END LOOP;
  END IF;
  UPDATE public.stock_transfers SET status = 'cancelled' WHERE id = _transfer_id;
  INSERT INTO public.stock_transfer_events(transfer_id, event_type, actor_id, details) VALUES (_transfer_id, 'cancelled', v_user, jsonb_build_object('reason', trim(_reason)));
END;
$$;

REVOKE ALL ON FUNCTION public.create_stock_transfer_draft(uuid,uuid,text,date,date,text,text,text,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatch_stock_transfer(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.receive_stock_transfer(uuid,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_stock_transfer(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stock_transfer_draft(uuid,uuid,text,date,date,text,text,text,text,text,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_stock_transfer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.receive_stock_transfer(uuid,text,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_stock_transfer(uuid,text) TO authenticated, service_role;