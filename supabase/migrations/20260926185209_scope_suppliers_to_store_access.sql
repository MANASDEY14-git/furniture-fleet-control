-- ─────────────────────────────────────────────────────────────────────────────
-- Supplier Store Scoping — Privacy Fix
--
-- PART 1: Replace permissive RLS policy with a store-scoped one.
--         Non-admin users only see suppliers that are mapped to their store(s)
--         via supplier_store_access. Admins see everything.
--
-- PART 2: Auto-map trigger — when a non-admin creates a supplier, the DB
--         immediately inserts a row into supplier_store_access linking that
--         new supplier to the creator's store. No manual admin step needed.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── PART 1: Store-scoped RLS ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can access suppliers for their stores" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers visible only to mapped stores"     ON public.suppliers;

CREATE POLICY "Suppliers visible only to mapped stores"
ON public.suppliers
FOR ALL
USING (
  -- Admins bypass the check and see every supplier
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Non-admins: supplier must be mapped to at least one of the user's stores
  EXISTS (
    SELECT 1
    FROM public.supplier_store_access ssa
    JOIN public.user_store_access      usa ON usa.store_id = ssa.store_id
    WHERE ssa.supplier_id = suppliers.id
      AND usa.user_id     = auth.uid()
  )
);

-- ── PART 2: Auto-map trigger ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_map_supplier_to_creator_store()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user     uuid := auth.uid();
  v_store_id uuid;
BEGIN
  -- Admins manage mappings manually via the Command Center dialog; skip them.
  IF has_role(v_user, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Find the creator's primary store (first accessible store).
  SELECT store_id INTO v_store_id
  FROM public.user_store_access
  WHERE user_id = v_user
  ORDER BY created_at
  LIMIT 1;

  -- Create the mapping if a store was found.
  -- ON CONFLICT DO NOTHING makes this safe if the mapping already exists.
  IF v_store_id IS NOT NULL THEN
    INSERT INTO public.supplier_store_access (supplier_id, store_id)
    VALUES (NEW.id, v_store_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to suppliers INSERT
DROP TRIGGER IF EXISTS trg_auto_map_supplier_to_store ON public.suppliers;
CREATE TRIGGER trg_auto_map_supplier_to_store
  AFTER INSERT ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_map_supplier_to_creator_store();

-- Tighten function permissions
REVOKE ALL ON FUNCTION public.auto_map_supplier_to_creator_store() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.auto_map_supplier_to_creator_store()
  TO authenticated, service_role;

-- ── PART 3: Fix INSERT policy so store users (not only admins) can create suppliers
-- The auto-map trigger fires immediately after INSERT to link the new supplier
-- to the creator's store. Without this, only admins could create suppliers.

DROP POLICY IF EXISTS "Admins can insert suppliers" ON public.suppliers;

CREATE POLICY "Authenticated users with store access can insert suppliers"
ON public.suppliers
FOR INSERT
WITH CHECK (
  -- Admins can always create suppliers
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Non-admins must have at least one store assigned to them
  EXISTS (
    SELECT 1 FROM public.user_store_access
    WHERE user_id = auth.uid()
  )
);
