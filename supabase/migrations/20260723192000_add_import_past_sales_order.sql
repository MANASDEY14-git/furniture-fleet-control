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
  v_status text := 'pending';
BEGIN
  -- 1. Find or create category
  IF _category_name IS NOT NULL AND _category_name <> '' THEN
    SELECT id INTO v_category_id FROM public.categories WHERE UPPER(name) = UPPER(TRIM(_category_name)) LIMIT 1;
    IF v_category_id IS NULL THEN
      INSERT INTO public.categories (name) VALUES (TRIM(_category_name)) RETURNING id INTO v_category_id;
    END IF;
  END IF;

  -- 2. Find or create item
  SELECT id INTO v_item_id FROM public.items WHERE UPPER(name) = UPPER(TRIM(_item_name)) LIMIT 1;
  IF v_item_id IS NULL THEN
    INSERT INTO public.items (
      name, category_id, store_id, quantity_available, cost_price, selling_price, stock_receive_date
    ) VALUES (
      TRIM(_item_name), v_category_id, _store_id, 100, _cost_price, _unit_price, (_order_date - interval '30 days')::date
    ) RETURNING id INTO v_item_id;
  END IF;

  -- 3. Find or create sales order
  -- Check if order already exists by order_number
  SELECT id INTO v_order_id FROM public.sales_orders WHERE order_number = _order_number LIMIT 1;
  
  IF v_order_id IS NULL THEN
    INSERT INTO public.sales_orders (
      order_number, store_id, date, customer_name, delivery_status, total_amount, description, status, salesperson_name
    ) VALUES (
      _order_number, _store_id, _order_date, _customer_name, 'Delivered', 0, 'Historical past order import', 'pending', _salespeople
    ) RETURNING id INTO v_order_id;
  END IF;

  -- 4. Calculate total price with discount
  v_total_price := (_unit_price * (1.0 - COALESCE(_discount_pct, 0) / 100.0)) * _quantity;

  -- 5. Insert order item
  INSERT INTO public.sales_order_items (
    order_id, item_id, item_name, quantity, unit_price, total_price, discount
  ) VALUES (
    v_order_id, v_item_id, _item_name, _quantity, _unit_price, v_total_price, _discount_pct
  );

  -- 6. Update order total amount
  UPDATE public.sales_orders 
  SET total_amount = (SELECT SUM(total_price) FROM public.sales_order_items WHERE order_id = v_order_id)
  WHERE id = v_order_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_past_sales_order TO authenticated;
