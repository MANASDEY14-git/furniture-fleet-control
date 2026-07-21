-- Create a function to check if user can access customer PII
CREATE OR REPLACE FUNCTION public.can_access_customer_pii(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager', 'sales_representative')
  );
$$;