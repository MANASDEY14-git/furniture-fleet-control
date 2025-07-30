# Stock Trigger Fixes

This document explains the fixes made to ensure that stock updates work correctly for both purchases and sales.

## Issues Found

### 1. Sales Stock Deduction Not Working
- **Problem**: The trigger was on `sales_orders` table instead of `sales_order_items`
- **Root Cause**: Stock should be deducted when individual items are added to sales orders, not when the order header is created
- **Impact**: Sales orders were created but stock wasn't being deducted

### 2. Purchase Stock Update Issues
- **Problem**: The function was looking for a `items` JSON field that no longer exists
- **Root Cause**: We removed the `items` field from purchases but didn't update the trigger function
- **Impact**: Purchases were created but stock wasn't being added

## Fixes Applied

### Migration: `20250730062408_fix_sales_stock_deduction.sql`

#### 1. Fixed Sales Stock Deduction
**Before:**
```sql
-- Trigger was on sales_orders table
CREATE TRIGGER trigger_handle_sales_stock_deduction
  AFTER INSERT ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_stock_deduction();
```

**After:**
```sql
-- Trigger is now on sales_order_items table
CREATE TRIGGER trigger_handle_sales_stock_deduction
  AFTER INSERT ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sales_stock_deduction();
```

#### 2. Fixed Purchase Stock Update
**Before:**
```sql
-- Function was looking for items JSON field
FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
```

**After:**
```sql
-- Function works directly with purchase record
UPDATE public.items
SET 
  quantity_available = quantity_available + NEW.quantity,
  cost_price = CASE 
    WHEN quantity_available + NEW.quantity > 0 THEN
      ((quantity_available * cost_price) + NEW.total_cost) / (quantity_available + NEW.quantity)
    ELSE NEW.total_cost / NEW.quantity
  END
WHERE id = NEW.item_id;
```

#### 3. Added DELETE Triggers
Created reverse triggers for all operations:
- `trigger_reverse_sales_stock_deduction` - Restores stock when sales order items are deleted
- `trigger_reverse_purchase_stock` - Reduces stock when purchases are deleted
- `trigger_reverse_sale_stock` - Restores stock when direct sales are deleted

## How It Works Now

### Purchase Flow:
1. User creates a purchase
2. Purchase record is inserted into `purchases` table
3. Trigger `trigger_update_item_stock_on_purchase` fires
4. Function updates the corresponding item:
   - Increases `quantity_available`
   - Recalculates `cost_price` (weighted average)
   - Updates `last_restocked_date`

### Sales Flow:
1. User creates a sales order
2. Sales order header is created in `sales_orders` table
3. Sales order items are created in `sales_order_items` table
4. Trigger `trigger_handle_sales_stock_deduction` fires for each item
5. Function deducts stock from the corresponding items:
   - Decreases `quantity_available`
   - Updates `updated_at` timestamp

### Delete Flow:
1. When a purchase/sale is deleted
2. Reverse trigger fires
3. Stock is restored to previous levels

## Testing

### Test Script: `test_triggers.sql`
Run this script in your Supabase SQL Editor to verify:
1. Purchase triggers work (stock increases)
2. Sales triggers work (stock decreases)
3. All triggers are properly installed
4. All functions are accessible

### Manual Testing:
1. **Create a Purchase**:
   - Go to Purchases page
   - Create a new purchase
   - Check that item quantity increases in Inventory

2. **Create a Sales Order**:
   - Go to Sales page
   - Create a new sales order
   - Check that item quantity decreases in Inventory

3. **Delete Operations**:
   - Delete a purchase → Stock should decrease
   - Delete a sales order → Stock should increase

## Verification Queries

### Check Trigger Status:
```sql
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%stock%' 
AND trigger_schema = 'public';
```

### Check Function Status:
```sql
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%stock%';
```

### Monitor Stock Changes:
```sql
-- Check item quantities
SELECT id, name, quantity_available, updated_at 
FROM items 
ORDER BY updated_at DESC;

-- Check recent purchases
SELECT item_id, quantity, total_cost, created_at 
FROM purchases 
ORDER BY created_at DESC;

-- Check recent sales order items
SELECT item_id, quantity, unit_price, created_at 
FROM sales_order_items 
ORDER BY created_at DESC;
```

## Troubleshooting

### If Stock Updates Still Don't Work:

1. **Check Trigger Permissions**:
   ```sql
   GRANT EXECUTE ON FUNCTION public.handle_sales_stock_deduction() TO authenticated;
   GRANT EXECUTE ON FUNCTION public.update_item_stock_on_purchase() TO authenticated;
   ```

2. **Check Function Syntax**:
   ```sql
   SELECT pg_get_functiondef(oid) 
   FROM pg_proc 
   WHERE proname = 'handle_sales_stock_deduction';
   ```

3. **Check for Errors**:
   ```sql
   SELECT * FROM pg_stat_activity 
   WHERE state = 'active' 
   AND query LIKE '%trigger%';
   ```

4. **Force Schema Reload**:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

### Common Issues:

1. **Permission Denied**: Make sure functions have proper permissions
2. **Function Not Found**: Check if functions were created successfully
3. **Trigger Not Firing**: Verify trigger is on correct table
4. **Data Type Mismatch**: Ensure UUID fields match correctly

## Performance Considerations

### Indexes:
- Ensure `item_id` columns are indexed
- Monitor trigger execution time
- Consider batch operations for large datasets

### Monitoring:
- Track trigger execution frequency
- Monitor stock change patterns
- Alert on unusual stock movements

## Future Enhancements

### Potential Improvements:
1. **Stock Alerts**: Notify when stock is low
2. **Audit Trail**: Log all stock changes
3. **Batch Operations**: Handle multiple items efficiently
4. **Stock Reservations**: Reserve stock for pending orders
5. **Cost Tracking**: Track cost changes over time

### Advanced Features:
1. **Stock Transfers**: Move stock between stores
2. **Stock Adjustments**: Manual stock corrections
3. **Stock Forecasting**: Predict future stock needs
4. **Supplier Performance**: Track supplier delivery times 