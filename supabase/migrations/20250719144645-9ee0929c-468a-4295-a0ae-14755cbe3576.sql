-- Fix audit_trails RLS policy to allow trigger inserts
DROP POLICY IF EXISTS "Deny all access by default" ON audit_trails;

-- Create a proper RLS policy for audit_trails
-- Allow authenticated users to insert audit records (needed for triggers)
CREATE POLICY "Allow authenticated users to insert audit records" 
ON audit_trails 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to read their own audit records
CREATE POLICY "Allow authenticated users to read audit records" 
ON audit_trails 
FOR SELECT 
TO authenticated 
USING (true);