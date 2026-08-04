-- 1. Drop legacy unchecked get_inventory_intelligence overload
DROP FUNCTION IF EXISTS public.get_inventory_intelligence(uuid, date, date, uuid, uuid, text, text, text, numeric, numeric);

-- 2. Enforce store-access check in import_past_sales_order
CREATE OR REPLACE FUNCTION public.import_past_sales_order(
  _order_date date,
  _order_number text,
  _customer_name text,
  _category_name text,
  _item_name text,
  _quantity integer,
  _unit_price numeric,
  _cost_price numeric,
  _discount_pct numeric,
  _salespeople text,
  _store_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_category_id uuid;
  v_item_id uuid;
  v_order_id uuid;
  v_total_price numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _store_id IS NULL OR NOT public.user_has_store_access(_store_id) THEN
    RAISE EXCEPTION 'Access denied to this store';
  END IF;

  IF _category_name IS NOT NULL AND _category_name <> '' THEN
    SELECT id INTO v_category_id FROM public.categories WHERE UPPER(name) = UPPER(TRIM(_category_name)) LIMIT 1;
    IF v_category_id IS NULL THEN
      INSERT INTO public.categories (name) VALUES (TRIM(_category_name)) RETURNING id INTO v_category_id;
    END IF;
  END IF;

  SELECT id INTO v_item_id FROM public.items
   WHERE UPPER(name) = UPPER(TRIM(_item_name)) AND store_id = _store_id LIMIT 1;
  IF v_item_id IS NULL THEN
    INSERT INTO public.items (
      name, category_id, store_id, quantity_available, cost_price, selling_price, stock_receive_date
    ) VALUES (
      TRIM(_item_name), v_category_id, _store_id, 100, _cost_price, _unit_price, (_order_date - interval '30 days')::date
    ) RETURNING id INTO v_item_id;
  END IF;

  SELECT id INTO v_order_id FROM public.sales_orders
   WHERE order_number = _order_number AND store_id = _store_id LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO public.sales_orders (
      order_number, store_id, date, customer_name, delivery_status, total_amount, description, status, salesperson_name
    ) VALUES (
      _order_number, _store_id, _order_date, _customer_name, 'Delivered', 0, 'Historical past order import', 'pending', _salespeople
    ) RETURNING id INTO v_order_id;
  END IF;

  v_total_price := (_unit_price * (1.0 - COALESCE(_discount_pct, 0) / 100.0)) * _quantity;

  INSERT INTO public.sales_order_items (
    order_id, item_id, item_name, quantity, unit_price, total_price, discount
  ) VALUES (
    v_order_id, v_item_id, _item_name, _quantity, _unit_price, v_total_price, _discount_pct
  );

  UPDATE public.sales_orders
  SET total_amount = (SELECT SUM(total_price) FROM public.sales_order_items WHERE order_id = v_order_id)
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.import_past_sales_order(date, text, text, text, text, integer, numeric, numeric, numeric, text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.import_past_sales_order(date, text, text, text, text, integer, numeric, numeric, numeric, text, uuid) TO authenticated;

-- 3. Restrict labor_categories writes to admin/manager
DROP POLICY IF EXISTS "Authenticated users can manage labor categories" ON public.labor_categories;

CREATE POLICY "Authenticated users can view labor categories"
ON public.labor_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can insert labor categories"
ON public.labor_categories FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins and managers can update labor categories"
ON public.labor_categories FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can delete labor categories"
ON public.labor_categories FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));