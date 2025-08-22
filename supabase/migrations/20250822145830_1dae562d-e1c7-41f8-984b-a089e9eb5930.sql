-- Check current triggers on purchases table and remove duplicates
-- First, let's see what triggers exist
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- List all triggers on purchases table
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers 
        WHERE event_object_table = 'purchases'
    LOOP
        RAISE NOTICE 'Found trigger: % on % %', trigger_record.trigger_name, trigger_record.action_timing, trigger_record.event_manipulation;
    END LOOP;
END $$;

-- Drop all existing triggers on purchases table to start clean
DROP TRIGGER IF EXISTS trigger_update_item_stock_on_purchase ON purchases;
DROP TRIGGER IF EXISTS update_item_stock_trigger ON purchases;
DROP TRIGGER IF EXISTS purchases_stock_update_trigger ON purchases;
DROP TRIGGER IF EXISTS update_stock_on_purchase ON purchases;

-- Create only ONE trigger for stock updates
CREATE TRIGGER trigger_update_item_stock_on_purchase
  AFTER INSERT ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_item_stock_on_purchase();

-- Verify we have only the correct trigger
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE event_object_table = 'purchases' 
    AND event_manipulation = 'INSERT';
    
    RAISE NOTICE 'Total INSERT triggers on purchases table: %', trigger_count;
END $$;