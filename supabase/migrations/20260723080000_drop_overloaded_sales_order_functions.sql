-- Drop the 16-parameter function signature
DROP FUNCTION IF EXISTS public.create_sales_order_secure(
  text, uuid, uuid, text, text, text, text, text, text, numeric, text, numeric, jsonb, jsonb, uuid, text
);

-- Drop the 17-parameter function signature
DROP FUNCTION IF EXISTS public.create_sales_order_secure(
  text, uuid, uuid, text, text, text, text, text, text, numeric, text, numeric, jsonb, jsonb, uuid, text, text
);
