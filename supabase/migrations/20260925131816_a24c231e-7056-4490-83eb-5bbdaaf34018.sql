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
  v_destination_item_id uuid;
  v_match_count integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT (public.has_role(v_user, 'admin') OR public.has_role(v_user, 'manager')) THEN RAISE EXCEPTION 'Manager access required'; END IF;
  IF NOT public.user_has_store_access(_source_store_id) THEN RAISE EXCEPTION 'No access to source godown'; END IF;
  IF _source_store_id = _destination_store_id THEN RAISE EXCEPTION 'Source and destination must differ'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = _destination_store_id) THEN RAISE EXCEPTION 'Destination godown is invalid'; END IF;
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
    IF v_qty <= 0 OR v_qty <> trunc(v_qty) OR v_price <= 0 THEN RAISE EXCEPTION 'Quantity must be a positive whole number and transfer price must be positive'; END IF;

    SELECT * INTO v_source_item FROM public.items WHERE id = (v_line->>'source_item_id')::uuid AND store_id = _source_store_id AND NOT is_discontinued;
    IF NOT FOUND THEN RAISE EXCEPTION 'Source item is invalid'; END IF;

    v_destination_item_id := nullif(v_line->>'destination_item_id', '')::uuid;
    IF v_destination_item_id IS NULL THEN
      SELECT count(*), min(id) INTO v_match_count, v_destination_item_id
      FROM public.items
      WHERE store_id = _destination_store_id AND lower(trim(name)) = lower(trim(v_source_item.name)) AND NOT is_discontinued;
      IF v_match_count = 0 THEN RAISE EXCEPTION 'No matching destination item for %. Create the item at the destination first', v_source_item.name; END IF;
      IF v_match_count > 1 THEN RAISE EXCEPTION 'Multiple destination items match %. Approve a product mapping first', v_source_item.name; END IF;
    END IF;

    SELECT * INTO v_destination_item FROM public.items WHERE id = v_destination_item_id AND store_id = _destination_store_id AND NOT is_discontinued;
    IF NOT FOUND THEN RAISE EXCEPTION 'Destination item is invalid for %', v_source_item.name; END IF;

    INSERT INTO public.stock_transfer_lines (transfer_id, source_item_id, destination_item_id, source_variant_id, destination_variant_id, product_id, item_name_snapshot, quantity_dispatched, unit_transfer_price, condition_note)
    VALUES (v_transfer_id, v_source_item.id, v_destination_item.id, nullif(v_line->>'source_variant_id', '')::uuid, nullif(v_line->>'destination_variant_id', '')::uuid, nullif(v_line->>'product_id', '')::uuid, v_source_item.name, v_qty, v_price, nullif(trim(v_line->>'condition_note'), ''));
  END LOOP;

  UPDATE public.stock_transfers st SET total_quantity = x.qty, total_value = x.val
  FROM (SELECT transfer_id, sum(quantity_dispatched) qty, sum(line_value) val FROM public.stock_transfer_lines WHERE transfer_id = v_transfer_id GROUP BY transfer_id) x
  WHERE st.id = x.transfer_id;

  INSERT INTO public.stock_transfer_events (transfer_id, event_type, actor_id, details) VALUES (v_transfer_id, 'draft_created', v_user, jsonb_build_object('line_count', jsonb_array_length(_lines)));
  RETURN v_transfer_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_stock_transfer_draft(uuid,uuid,text,date,date,text,text,text,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_stock_transfer_draft(uuid,uuid,text,date,date,text,text,text,text,text,jsonb) TO authenticated, service_role;