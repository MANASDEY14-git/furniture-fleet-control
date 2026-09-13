DO $migration$
DECLARE
  function_definition text;
  old_category_joins text := $old$    LEFT JOIN public.items i ON i.category_id = c.id AND COALESCE(i.is_discontinued, false) = false
    LEFT JOIN public.sales_order_items soi ON soi.item_id = i.id
    LEFT JOIN public.sales_orders so ON so.id = soi.order_id
      AND lower(COALESCE(so.delivery_status, '')) <> 'cancelled'
      AND COALESCE(so.document_type, 'order') = 'order'$old$;
  new_category_joins text := $new$    LEFT JOIN public.items i ON i.category_id = c.id
      AND i.store_id = _store_id
      AND COALESCE(i.is_discontinued, false) = false
    LEFT JOIN public.sales_order_items soi ON soi.item_id = i.id
    LEFT JOIN public.sales_orders so ON so.id = soi.order_id
      AND so.store_id = _store_id
      AND lower(COALESCE(so.delivery_status, '')) <> 'cancelled'
      AND COALESCE(so.document_type, 'order') = 'order'$new$;
BEGIN
  SELECT pg_get_functiondef('public.get_reorder_intelligence(uuid,integer,integer)'::regprocedure)
    INTO function_definition;

  IF position(old_category_joins IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Expected category benchmark joins were not found in get_reorder_intelligence';
  END IF;

  function_definition := replace(function_definition, old_category_joins, new_category_joins);
  EXECUTE function_definition;
END;
$migration$;

REVOKE ALL ON FUNCTION public.get_reorder_intelligence(uuid, integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_reorder_intelligence(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reorder_intelligence(uuid, integer, integer) TO service_role;