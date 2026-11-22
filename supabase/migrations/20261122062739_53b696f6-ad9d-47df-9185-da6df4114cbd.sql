DROP POLICY IF EXISTS "Signed-in users can read chart of accounts" ON public.chart_of_accounts;

CREATE POLICY "Finance roles with store access can read chart of accounts"
ON public.chart_of_accounts
FOR SELECT
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'accountant'::public.app_role)
  )
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_store_access usa
      WHERE usa.user_id = auth.uid()
    )
  )
);