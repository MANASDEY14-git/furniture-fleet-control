-- Security Fix 1: Add missing RLS policies for actual tables only

-- Enable RLS on low_stock_alerts (this is a real table)
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;

-- Add store-based RLS policies for low_stock_alerts
CREATE POLICY "Users can access low stock alerts for their stores"
ON public.low_stock_alerts
FOR ALL
USING (user_has_store_access(store_id));

-- Security Fix 2: Clean up conflicting RLS policies

-- Remove overly permissive policies on sales_orders
DROP POLICY IF EXISTS "Allow delete for all" ON public.sales_orders;
DROP POLICY IF EXISTS "Allow read access" ON public.sales_orders;
DROP POLICY IF EXISTS "Allow read access to sales orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Allow read for all" ON public.sales_orders;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sales_orders;

-- Remove overly permissive policies on items
DROP POLICY IF EXISTS "Allow insert for all" ON public.items;
DROP POLICY IF EXISTS "Allow read access" ON public.items;
DROP POLICY IF EXISTS "Allow update for all" ON public.items;

-- Remove redundant policy on item_variants
DROP POLICY IF EXISTS "Allow authenticated users" ON public.item_variants;

-- Remove overly permissive policies on purchases
DROP POLICY IF EXISTS "Allow read access" ON public.purchases;

-- Remove overly permissive policy on supplier_ledger
DROP POLICY IF EXISTS "Allow read access" ON public.supplier_ledger;

-- Security Fix 3: Auto-assign users to default store upon registration
-- Create function to assign new users to the first available store
CREATE OR REPLACE FUNCTION public.assign_user_to_default_store()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_store_id uuid;
BEGIN
  -- Get the first available store (you may want to modify this logic)
  SELECT id INTO default_store_id 
  FROM public.stores 
  ORDER BY created_at 
  LIMIT 1;
  
  -- If a store exists, assign the user to it
  IF default_store_id IS NOT NULL THEN
    INSERT INTO public.user_store_access (user_id, store_id)
    VALUES (NEW.user_id, default_store_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign store access on profile creation
CREATE TRIGGER assign_default_store_access
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_user_to_default_store();

-- Security Fix 4: Ensure admin users have access to all stores
CREATE OR REPLACE FUNCTION public.grant_admin_store_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- If user is assigned admin role, grant access to all stores
  IF NEW.role = 'admin' THEN
    INSERT INTO public.user_store_access (user_id, store_id)
    SELECT NEW.user_id, s.id
    FROM public.stores s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_store_access usa
      WHERE usa.user_id = NEW.user_id AND usa.store_id = s.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for admin store access
CREATE TRIGGER grant_admin_access_to_stores
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'admin')
  EXECUTE FUNCTION public.grant_admin_store_access();

-- Security Fix 5: Add audit trail for sensitive table access
CREATE TRIGGER audit_sales_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_purchases_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger();

-- Security Fix 6: Add logging trigger for sensitive operations
CREATE TRIGGER log_sales_orders_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_operation();

CREATE TRIGGER log_payments_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_operation();

CREATE TRIGGER log_purchases_operations
  AFTER INSERT OR UPDATE OR DELETE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_operation();