-- ==============================================================================
-- Migration: 20261128130000_gst_architectural_hardening.sql
-- Description: Architectural and Security Hardening for Phase 3 GST & Compliance
-- 1. Enable RLS on gst_states with read-only policy
-- 2. Convert GSTR views to SECURITY INVOKER (respect underlying table RLS)
-- 3. Fix search_path on validate_payment_bank_account
-- 4. Restrict sensitive RPC execution from anon
-- ==============================================================================

-- 1. Enable RLS on gst_states
ALTER TABLE public.gst_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated and anon read of gst_states" ON public.gst_states;
CREATE POLICY "Allow authenticated and anon read of gst_states"
  ON public.gst_states FOR SELECT
  TO authenticated, anon
  USING (true);

-- 2. Convert GSTR views to SECURITY INVOKER
ALTER VIEW public.view_gstr1_b2b SET (security_invoker = true);
ALTER VIEW public.view_gstr1_b2cs SET (security_invoker = true);
ALTER VIEW public.view_gstr1_hsn_summary SET (security_invoker = true);
ALTER VIEW public.view_gstr3b_outward_supplies SET (security_invoker = true);
ALTER VIEW public.view_trial_balance SET (security_invoker = true);

-- 3. Fix mutable search_path on functions
ALTER FUNCTION public.validate_payment_bank_account() SET search_path TO 'public';

-- 4. Restrict execute permissions from unauthenticated (anon) role
REVOKE EXECUTE ON FUNCTION public.generate_gst_invoice_number(UUID, DATE) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_gst_invoice_number(UUID, DATE) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.calculate_order_taxes(UUID) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_order_taxes(UUID) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.assign_gst_invoice_on_order() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_gst_invoice_on_order() TO authenticated, service_role;
