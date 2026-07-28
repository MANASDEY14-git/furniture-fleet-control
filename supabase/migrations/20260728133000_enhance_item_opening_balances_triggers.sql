-- Migration: Enhance item opening balances triggers
-- Description: Re-creates the item opening balance triggers to sync on insert, update, and delete, and automatically seeds opening balances for newly created items.

-- 1. Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS trg_iob_sync_stock ON public.item_opening_balances;
DROP TRIGGER IF EXISTS trg_item_before_insert ON public.items;
DROP TRIGGER IF EXISTS trg_item_after_insert ON public.items;

-- 2. Create or replace the function to sync item opening balances to live stock (handling INSERT, UPDATE, and DELETE)
CREATE OR REPLACE FUNCTION public.sync_item_opening_balance_to_stock()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fy_label text;
  v_notes text;
  v_item_id uuid;
  v_store_id uuid;
  v_qty_change numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_item_id := NEW.item_id;
    v_store_id := NEW.store_id;
    v_qty_change := NEW.opening_quantity;
    v_notes := NEW.notes;
    
    SELECT label INTO v_fy_label FROM public.financial_years WHERE id = NEW.financial_year_id;

    -- Update live stock
    UPDATE public.items
       SET quantity_available = quantity_available + v_qty_change,
           cost_price = CASE WHEN COALESCE(cost_price,0) = 0 THEN NEW.opening_unit_cost ELSE cost_price END,
           updated_at = now()
     WHERE id = v_item_id;

  ELSIF TG_OP = 'UPDATE' THEN
    v_item_id := NEW.item_id;
    v_store_id := NEW.store_id;
    v_qty_change := NEW.opening_quantity - OLD.opening_quantity;
    v_notes := NEW.notes;

    SELECT label INTO v_fy_label FROM public.financial_years WHERE id = NEW.financial_year_id;

    -- Update live stock
    UPDATE public.items
       SET quantity_available = quantity_available + v_qty_change,
           updated_at = now()
     WHERE id = v_item_id;

  ELSIF TG_OP = 'DELETE' THEN
    v_item_id := OLD.item_id;
    v_store_id := OLD.store_id;
    v_qty_change := -OLD.opening_quantity;
    v_notes := OLD.notes;

    SELECT label INTO v_fy_label FROM public.financial_years WHERE id = OLD.financial_year_id;

    -- Update live stock
    UPDATE public.items
       SET quantity_available = quantity_available + v_qty_change,
           updated_at = now()
     WHERE id = v_item_id;
  END IF;

  -- Insert stock adjustment record for auditing
  INSERT INTO public.stock_adjustments (
    item_id, store_id, quantity_change, adjustment_type, reason, notes, adjusted_by
  ) VALUES (
    v_item_id, v_store_id,
    v_qty_change,
    'opening_balance',
    'FY ' || COALESCE(v_fy_label,'') || ' opening',
    v_notes,
    auth.uid()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- Re-create the sync trigger for INSERT, UPDATE, and DELETE
CREATE TRIGGER trg_iob_sync_stock
  AFTER INSERT OR UPDATE OR DELETE ON public.item_opening_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_item_opening_balance_to_stock();

-- 3. Create functions and triggers for items table to automatically seed opening balances on item creation
CREATE OR REPLACE FUNCTION public.handle_item_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_active_fy_id uuid;
BEGIN
  -- Get active financial year
  SELECT id INTO v_active_fy_id
  FROM public.financial_years
  WHERE is_active = true AND is_closed = false
  LIMIT 1;

  -- Set quantity_available to 0 temporarily if an active financial year exists,
  -- and store the initial quantity in a session variable.
  -- This allows the item_opening_balances trigger to update items.quantity_available
  -- without double-counting.
  IF v_active_fy_id IS NOT NULL AND COALESCE(NEW.quantity_available, 0) > 0 THEN
    IF NEW.id IS NULL THEN
      NEW.id := gen_random_uuid();
    END IF;
    PERFORM set_config('app.initial_item_qty_' || replace(NEW.id::text, '-', '_'), NEW.quantity_available::text, true);
    NEW.quantity_available := 0;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_item_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_active_fy_id uuid;
  v_active_fy_start date;
  v_initial_qty numeric;
  v_initial_qty_text text;
BEGIN
  -- Get the active financial year
  SELECT id, start_date INTO v_active_fy_id, v_active_fy_start
  FROM public.financial_years
  WHERE is_active = true AND is_closed = false
  LIMIT 1;

  -- Try to retrieve the initial quantity from the session variable
  BEGIN
    v_initial_qty_text := current_setting('app.initial_item_qty_' || replace(NEW.id::text, '-', '_'), true);
    IF v_initial_qty_text IS NOT NULL AND v_initial_qty_text != '' THEN
      v_initial_qty := v_initial_qty_text::numeric;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_initial_qty := 0;
  END;

  IF v_active_fy_id IS NOT NULL AND COALESCE(v_initial_qty, 0) > 0 THEN
    INSERT INTO public.item_opening_balances (
      item_id,
      store_id,
      financial_year_id,
      opening_quantity,
      opening_unit_cost,
      opening_value,
      effective_date,
      notes
    ) VALUES (
      NEW.id,
      NEW.store_id,
      v_active_fy_id,
      v_initial_qty,
      COALESCE(NEW.cost_price, 0),
      v_initial_qty * COALESCE(NEW.cost_price, 0),
      v_active_fy_start,
      'Initial stock on item creation'
    )
    ON CONFLICT (item_id, store_id, financial_year_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the before/after triggers on items
CREATE TRIGGER trg_item_before_insert
  BEFORE INSERT ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_item_before_insert();

CREATE TRIGGER trg_item_after_insert
  AFTER INSERT ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_item_after_insert();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.sync_item_opening_balance_to_stock() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_item_before_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_item_after_insert() TO authenticated;
