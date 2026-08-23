REVOKE EXECUTE ON FUNCTION public.get_receivables_aging(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_money_summary(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_dispatch_board(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_delivery_performance(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_receivables_aging(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_money_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dispatch_board(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_performance(uuid, integer) TO authenticated;