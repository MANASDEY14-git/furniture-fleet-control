
-- Drop the old overloaded signature to prevent ambiguity
DROP FUNCTION IF EXISTS public.create_sales_order_secure(text, uuid, uuid, date, text, text, text, date, text, numeric, text, numeric, jsonb, jsonb, uuid);
