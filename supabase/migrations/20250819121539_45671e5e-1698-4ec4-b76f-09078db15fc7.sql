-- Test RLS policies for material_purchases by creating a test function
-- This will help us understand if the issue is with authentication or the table setup

CREATE OR REPLACE FUNCTION test_material_purchases_access()
RETURNS TABLE(can_select BOOLEAN, can_insert BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_result BOOLEAN;
  error_msg TEXT;
BEGIN
  -- Test SELECT permission
  BEGIN
    PERFORM 1 FROM material_purchases LIMIT 1;
    can_select := TRUE;
  EXCEPTION WHEN others THEN
    can_select := FALSE;
    error_msg := SQLERRM;
  END;
  
  -- Test INSERT permission (we'll rollback)
  BEGIN
    -- Start a savepoint for rollback
    SAVEPOINT test_insert;
    
    INSERT INTO material_purchases (
      material_id, 
      quantity, 
      unit_cost, 
      total_cost, 
      date
    ) VALUES (
      (SELECT id FROM materials LIMIT 1),  -- Get any existing material
      1,
      10.0,
      10.0,
      CURRENT_DATE
    );
    
    can_insert := TRUE;
    
    -- Rollback the test insert
    ROLLBACK TO test_insert;
    
  EXCEPTION WHEN others THEN
    can_insert := FALSE;
    IF error_msg IS NULL THEN
      error_msg := SQLERRM;
    END IF;
    ROLLBACK TO test_insert;
  END;
  
  error_message := COALESCE(error_msg, 'No errors');
  
  RETURN NEXT;
END;
$$;

-- Run the test
SELECT * FROM test_material_purchases_access();