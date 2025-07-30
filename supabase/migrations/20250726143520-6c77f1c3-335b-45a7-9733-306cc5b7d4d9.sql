-- CRITICAL SECURITY FIXES FOR DATABASE (FIXED VERSION)

-- Step 1: Fix database functions with missing search path security
-- This prevents malicious schema manipulation attacks

ALTER FUNCTION public.audit_trigger() SET search_path = '';
ALTER FUNCTION public.deduct_bom_materials_on_sale() SET search_path = '';
ALTER FUNCTION public.update_material_stock_on_purchase() SET search_path = '';
ALTER FUNCTION public.handle_sales_variant_stock() SET search_path = '';
ALTER FUNCTION public.update_parent_item_quantity_v2() SET search_path = '';
ALTER FUNCTION public.update_variant_stock_on_purchase() SET search_path = '';
ALTER FUNCTION public.handle_sales_variant_stock_v2() SET search_path = '';
ALTER FUNCTION public.update_item_cost_and_stock_date() SET search_path = '';
ALTER FUNCTION public.create_supplier_ledger_entry_for_purchase() SET search_path = '';
ALTER FUNCTION public.update_cost_and_stock_date() SET search_path = '';
ALTER FUNCTION public.update_cost_price_on_purchase() SET search_path = '';
ALTER FUNCTION public.update_parent_item_quantity() SET search_path = '';
ALTER FUNCTION public.update_cost_price_from_purchase() SET search_path = '';
ALTER FUNCTION public.create_supplier_ledger_entry_for_payment() SET search_path = '';
ALTER FUNCTION public.insert_receipt_from_sales() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.deduct_variant_stock_on_sale() SET search_path = '';

-- Step 2: Create user-store relationship table for proper multi-tenant access
CREATE TABLE IF NOT EXISTS public.user_store_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, store_id)
);

ALTER TABLE public.user_store_access ENABLE ROW LEVEL SECURITY;

-- Users can only see their own store access
DROP POLICY IF EXISTS "Users can view their own store access" ON public.user_store_access;
CREATE POLICY "Users can view their own store access"
ON public.user_store_access FOR SELECT
USING (auth.uid() = user_id);

-- Only authenticated users can insert store access
DROP POLICY IF EXISTS "Authenticated users can manage store access" ON public.user_store_access;
CREATE POLICY "Authenticated users can manage store access"
ON public.user_store_access FOR ALL
USING (auth.uid() = user_id);

-- Step 3: Create security definer function for store access checks
CREATE OR REPLACE FUNCTION public.user_has_store_access(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_store_access
    WHERE user_id = auth.uid()
      AND store_id = _store_id
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Step 4: Secure financial and business data with proper RLS policies
-- Drop overly permissive policies and replace with secure ones

-- Secure payments table
DROP POLICY IF EXISTS "Allow all operations on payments" ON public.payments;
CREATE POLICY "Users can access payments for their stores"
ON public.payments FOR ALL
USING (public.user_has_store_access(store_id));

-- Secure sales_orders table  
DROP POLICY IF EXISTS "Allow insert for sales_orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Allow update on sales_orders" ON public.sales_orders;
CREATE POLICY "Users can manage sales orders for their stores"
ON public.sales_orders FOR ALL
USING (public.user_has_store_access(store_id));

-- Secure sales table
DROP POLICY IF EXISTS "Authenticated users can access sales" ON public.sales;
CREATE POLICY "Users can access sales for their stores"
ON public.sales FOR ALL
USING (public.user_has_store_access(store_id));

-- Secure purchases table
DROP POLICY IF EXISTS "Authenticated users can access purchases" ON public.purchases;
CREATE POLICY "Users can access purchases for their stores"
ON public.purchases FOR ALL
USING (public.user_has_store_access(store_id));

-- Secure items table
DROP POLICY IF EXISTS "Authenticated users can access items" ON public.items;
CREATE POLICY "Users can access items for their stores"
ON public.items FOR ALL
USING (public.user_has_store_access(store_id));

-- Secure supplier_ledger
DROP POLICY IF EXISTS "Allow all operations on supplier_ledger" ON public.supplier_ledger;
CREATE POLICY "Users can access supplier ledger for their stores"
ON public.supplier_ledger FOR ALL
USING (public.user_has_store_access(store_id));

-- Secure materials
DROP POLICY IF EXISTS "Allow all operations on materials" ON public.materials;
CREATE POLICY "Users can access materials for their stores"
ON public.materials FOR ALL
USING (public.user_has_store_access(store_id));

-- Secure material_purchases
DROP POLICY IF EXISTS "Allow all operations on material_purchases" ON public.material_purchases;
CREATE POLICY "Users can access material purchases for their stores"
ON public.material_purchases FOR ALL
USING (public.user_has_store_access(store_id));

-- Step 5: Ensure sales_order_items are properly secured
DROP POLICY IF EXISTS "Allow all inserts" ON public.sales_order_items;
DROP POLICY IF EXISTS "Allow read for all" ON public.sales_order_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sales_order_items;

CREATE POLICY "Users can access sales order items for their stores"
ON public.sales_order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.sales_orders 
    WHERE sales_orders.id = sales_order_items.order_id 
    AND public.user_has_store_access(sales_orders.store_id)
  )
);

-- Step 6: Add audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security audit logs
DROP POLICY IF EXISTS "Only admins can view security audit logs" ON public.security_audit_log;
CREATE POLICY "Only admins can view security audit logs"
ON public.security_audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Function to log sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME IN ('payments', 'sales_orders', 'purchases') THEN
    INSERT INTO public.security_audit_log (
      user_id, action, table_name, record_id
    ) VALUES (
      auth.uid(), TG_OP, TG_TABLE_NAME, 
      CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
    );
  END IF;
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;