DO $migration$
DECLARE
  function_definition text;
  old_text text;
  new_text text;
BEGIN
  SELECT pg_get_functiondef('public.get_reorder_intelligence(uuid,integer,integer)'::regprocedure)
    INTO function_definition;

  old_text := $old$    FROM public.purchases p
    WHERE p.supplier_id IS NOT NULL$old$;
  new_text := $new$    FROM public.purchases p
    WHERE p.supplier_id IS NOT NULL
      AND p.store_id = _store_id$new$;
  IF position(old_text IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Expected supplier invoice scope was not found';
  END IF;
  function_definition := replace(function_definition, old_text, new_text);

  old_text := $old$    FROM public.purchases p
    WHERE p.item_id IS NOT NULL
    GROUP BY p.item_id$old$;
  new_text := $new$    FROM public.purchases p
    WHERE p.item_id IS NOT NULL
      AND p.store_id = _store_id
    GROUP BY p.item_id$new$;
  IF position(old_text IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Expected item purchase scope was not found';
  END IF;
  function_definition := replace(function_definition, old_text, new_text);

  old_text := $old$      AND soi.item_id IS NOT NULL
    GROUP BY soi.item_id
  ),
  category_rate_cte$old$;
  new_text := $new$      AND soi.item_id IS NOT NULL
      AND COALESCE(soi.stock_deducted, false) = false
    GROUP BY soi.item_id
  ),
  category_rate_cte$new$;
  IF position(old_text IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Expected open demand filter was not found';
  END IF;
  function_definition := replace(function_definition, old_text, new_text);

  function_definition := replace(function_definition, 'CURRENT_DATE - _window_days', 'CURRENT_DATE - 365');
  function_definition := replace(function_definition, '_window_days / 30.0', '365 / 30.0');

  EXECUTE function_definition;
END;
$migration$;

REVOKE ALL ON FUNCTION public.get_reorder_intelligence(uuid, integer, integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_reorder_intelligence(uuid, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_reorder_intelligence(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reorder_intelligence(uuid, integer, integer) TO service_role;