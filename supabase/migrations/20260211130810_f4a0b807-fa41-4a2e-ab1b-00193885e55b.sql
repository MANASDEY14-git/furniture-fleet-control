
-- Drop the old 13-parameter overload that conflicts with the new version
DROP FUNCTION IF EXISTS public.create_sales_order_secure(
  text, uuid, uuid, date, text, text, text, date, text, numeric, text, numeric, jsonb
);

-- Re-grant execute on the remaining function to be safe
GRANT EXECUTE ON FUNCTION public.create_sales_order_secure TO authenticated;
