-- Test the material_purchases table structure and permissions
-- This is a diagnostic query to ensure the table works correctly

SELECT 
  t.table_name,
  t.table_type,
  p.policyname,
  p.cmd,
  p.permissive,
  p.roles
FROM information_schema.tables t
LEFT JOIN pg_policies p ON p.tablename = t.table_name
WHERE t.table_schema = 'public' 
  AND t.table_name = 'material_purchases';