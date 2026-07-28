-- 1. Create a dummy category and store if they don't exist
INSERT INTO public.categories (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Category')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stores (id, name, location)
VALUES ('00000000-0000-0000-0000-000000000002', 'Test Store', 'Test Location')
ON CONFLICT (id) DO NOTHING;

-- 2. Test initial stock seeding on item creation
-- Select active financial year
DO $$
DECLARE
  v_item_id uuid := '00000000-0000-0000-0000-000000000003';
  v_fy_id uuid;
  v_qty int;
  v_ob_qty numeric;
  v_adj_qty numeric;
BEGIN
  SELECT id INTO v_fy_id FROM public.financial_years WHERE is_active = true AND is_closed = false LIMIT 1;
  
  -- Clean up previous test
  DELETE FROM public.stock_adjustments WHERE item_id = v_item_id;
  DELETE FROM public.item_opening_balances WHERE item_id = v_item_id;
  DELETE FROM public.items WHERE id = v_item_id;

  -- Create item with quantity_available = 15
  INSERT INTO public.items (id, name, category_id, store_id, quantity_available, cost_price, selling_price)
  VALUES (v_item_id, 'Test Item Seeding', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 15, 100.00, 150.00);

  -- Verify live stock
  SELECT quantity_available INTO v_qty FROM public.items WHERE id = v_item_id;
  IF v_qty != 15 THEN RAISE EXCEPTION 'Assert failed: Created item live quantity (expected 15, got %)', v_qty; END IF;

  -- Verify opening balance row
  SELECT opening_quantity INTO v_ob_qty FROM public.item_opening_balances WHERE item_id = v_item_id AND financial_year_id = v_fy_id;
  IF v_ob_qty != 15 THEN RAISE EXCEPTION 'Assert failed: Auto-created opening balance quantity (expected 15, got %)', v_ob_qty; END IF;

  -- Verify stock adjustment row
  SELECT SUM(quantity_change) INTO v_adj_qty FROM public.stock_adjustments WHERE item_id = v_item_id AND adjustment_type = 'opening_balance';
  IF v_adj_qty != 15 THEN RAISE EXCEPTION 'Assert failed: Auto-created stock adjustment quantity change (expected 15, got %)', v_adj_qty; END IF;

  -- 3. Test updating opening balance
  UPDATE public.item_opening_balances
  SET opening_quantity = 25
  WHERE item_id = v_item_id AND financial_year_id = v_fy_id;

  -- Verify live stock
  SELECT quantity_available INTO v_qty FROM public.items WHERE id = v_item_id;
  IF v_qty != 25 THEN RAISE EXCEPTION 'Assert failed: Updated item live quantity (expected 25, got %)', v_qty; END IF;

  -- Verify stock adjustment row sum
  SELECT SUM(quantity_change) INTO v_adj_qty FROM public.stock_adjustments WHERE item_id = v_item_id AND adjustment_type = 'opening_balance';
  IF v_adj_qty != 25 THEN RAISE EXCEPTION 'Assert failed: Total stock adjustments quantity change after update (expected 25, got %)', v_adj_qty; END IF;

  -- 4. Test deleting opening balance
  DELETE FROM public.item_opening_balances
  WHERE item_id = v_item_id AND financial_year_id = v_fy_id;

  -- Verify live stock
  SELECT quantity_available INTO v_qty FROM public.items WHERE id = v_item_id;
  IF v_qty != 0 THEN RAISE EXCEPTION 'Assert failed: Deleted item opening balance live quantity (expected 0, got %)', v_qty; END IF;

  -- Verify stock adjustment row sum
  SELECT SUM(quantity_change) INTO v_adj_qty FROM public.stock_adjustments WHERE item_id = v_item_id AND adjustment_type = 'opening_balance';
  IF v_adj_qty != 0 THEN RAISE EXCEPTION 'Assert failed: Total stock adjustments quantity change after delete (expected 0, got %)', v_adj_qty; END IF;

  -- Clean up
  DELETE FROM public.stock_adjustments WHERE item_id = v_item_id;
  DELETE FROM public.item_opening_balances WHERE item_id = v_item_id;
  DELETE FROM public.items WHERE id = v_item_id;
END;
$$;
