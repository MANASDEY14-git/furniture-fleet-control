-- Drop existing permissive policies on stores
DROP POLICY IF EXISTS "Authenticated users can access stores" ON public.stores;

-- Create new secure RLS policies for stores
-- Users can only SELECT stores they have access to (or admins see all)
CREATE POLICY "Users can view their assigned stores"
ON public.stores FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_store_access WHERE user_id = auth.uid() AND store_id = id)
  OR public.has_role(auth.uid(), 'admin')
);

-- Only admins can INSERT new stores
CREATE POLICY "Only admins can create stores"
ON public.stores FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can UPDATE stores
CREATE POLICY "Only admins can update stores"
ON public.stores FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can DELETE stores
CREATE POLICY "Only admins can delete stores"
ON public.stores FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing policies on user_store_access
DROP POLICY IF EXISTS "Authenticated users can manage store access" ON public.user_store_access;
DROP POLICY IF EXISTS "Users can view their own store access" ON public.user_store_access;

-- New secure RLS policies for user_store_access
-- Users can view their own access records
CREATE POLICY "Users can view own store access"
ON public.user_store_access FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Only admins can grant store access
CREATE POLICY "Admins can grant store access"
ON public.user_store_access FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can revoke store access
CREATE POLICY "Admins can revoke store access"
ON public.user_store_access FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create a function to check if user has any store access
CREATE OR REPLACE FUNCTION public.user_has_any_store_access(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_store_access WHERE user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- Create a function to get all users with their profiles (for admin use)
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  store_count bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.user_id,
    p.email,
    p.first_name,
    p.last_name,
    COALESCE(ur.role::text, 'employee') as role,
    COUNT(usa.id) as store_count,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN public.user_store_access usa ON usa.user_id = p.user_id
  GROUP BY p.user_id, p.email, p.first_name, p.last_name, ur.role, p.created_at
  ORDER BY p.created_at DESC;
END;
$$;