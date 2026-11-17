DROP POLICY IF EXISTS "Admins/managers manage categories" ON public.categories;
DROP POLICY IF EXISTS "Approved store users can read categories" ON public.categories;
CREATE POLICY "Authorized users can read categories"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.user_store_access usa WHERE usa.user_id = auth.uid())
  );
CREATE POLICY "Admins and managers can create categories"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );
CREATE POLICY "Admins and managers can update categories"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );
CREATE POLICY "Admins and managers can delete categories"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
  );