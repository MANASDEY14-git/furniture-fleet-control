-- Create a secure view for sales orders that automatically handles PII redaction
CREATE OR REPLACE VIEW public.sales_orders_secure AS
SELECT * FROM public.get_sales_orders_secure();

-- Grant necessary permissions
GRANT SELECT ON public.sales_orders_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_orders_secure(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_customer_pii(uuid) TO authenticated;