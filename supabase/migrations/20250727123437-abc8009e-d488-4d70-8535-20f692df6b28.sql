-- Fix database functions to properly reference the public schema for items table

-- Fix update_variant_stock_on_purchase function
CREATE OR REPLACE FUNCTION public.update_variant_stock_on_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  item jsonb;
  variant_id_val uuid;
  item_id_val uuid;
  unit_price_val numeric;
  quantity_val numeric;
BEGIN
  -- Loop through each item in the purchase JSON
  FOR item IN
    SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    variant_id_val := (item->>'variant_id')::uuid;
    item_id_val := (item->>'item_id')::uuid;
    unit_price_val := (item->>'unit_price')::numeric;
    quantity_val := (item->>'quantity')::numeric;
    
    -- Update variant stock if variant_id exists
    IF variant_id_val IS NOT NULL THEN
      UPDATE public.item_variants
      SET quantity_available = quantity_available + quantity_val,
          cost_price = unit_price_val,
          updated_at = now()
      WHERE id = variant_id_val;
    ELSE
      -- Update main item stock if no variant
      UPDATE public.items
      SET quantity_available = quantity_available + quantity_val,
          cost_price = unit_price_val,
          updated_at = now()
      WHERE id = item_id_val;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Fix update_item_cost_and_stock_date function
CREATE OR REPLACE FUNCTION public.update_item_cost_and_stock_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  -- Update the item's cost_price and stock_receive_date on every insert
  UPDATE public.items
  SET
    cost_price = NEW.cost_price,
    stock_receive_date = NEW.date,
    updated_at = NOW()
  WHERE id = NEW.item_id;

  RETURN NEW;
END;
$function$;

-- Fix update_cost_and_stock_date function
CREATE OR REPLACE FUNCTION public.update_cost_and_stock_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  new_cost numeric;
BEGIN
  -- Avoid division by zero
  if NEW.quantity = 0 then
    return NEW;
  end if;

  -- Calculate new cost
  new_cost := NEW.total_cost / NEW.quantity;

  -- Update the items table with new cost and latest purchase date
  update public.items
  set
    cost_price = new_cost,
    stock_receive_date = NEW.date
  where id = NEW.item_id;

  return NEW;
END;
$function$;

-- Fix update_cost_price_from_purchase function
CREATE OR REPLACE FUNCTION public.update_cost_price_from_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  item jsonb;
BEGIN
  -- Loop through each item in the purchase JSON
  for item in
    select * from jsonb_array_elements(new.items)
  loop
    -- Update main items table (if item_id exists)
    if item ? 'item_id' then
      update public.items
      set cost_price = (item->>'unit_price')::numeric
      where id = (item->>'item_id')::uuid;
    end if;

    -- Update item_variants table (if variant_id exists)
    if item ? 'variant_id' then
      update public.item_variants
      set cost_price = (item->>'unit_price')::numeric
      where id = (item->>'variant_id')::uuid;
    end if;
  end loop;

  return new;
END;
$function$;

-- Fix update_cost_price_on_purchase function
CREATE OR REPLACE FUNCTION public.update_cost_price_on_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  item jsonb;
  item_id uuid;
  variant_id uuid;
  unit_price numeric;
BEGIN
  -- loop through each item in purchases.items
  for item in select * from jsonb_array_elements(new.items)
  loop
    item_id := item->>'item_id';
    variant_id := item->>'variant_id';
    unit_price := (item->>'unit_price')::numeric;

    if variant_id is not null and variant_id <> '' then
      -- update item_variants
      update public.item_variants
      set cost_price = unit_price,
          updated_at = now()
      where id = variant_id;
    else
      -- update items directly
      update public.items
      set cost_price = unit_price,
          updated_at = now()
      where id = item_id;
    end if;
  end loop;

  return new;
END;
$function$;