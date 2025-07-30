# Purchase System Update

This document explains the changes made to the purchase system to work directly with the `items` table instead of using variants.

## Overview

The purchase system has been updated to work directly with the `items` table, similar to how the sales system works. This simplifies the data model and ensures consistency across the application.

## Changes Made

### 1. Database Triggers

**Migration**: `20250730055706_add_purchase_item_trigger.sql`

#### Functions Created:
- `update_item_stock_on_purchase()` - Updates item quantities and costs when purchases are made
- `reverse_purchase_stock()` - Reverses stock updates when purchases are deleted
- `update_purchase_stock()` - Handles stock updates when purchases are modified

#### Triggers Created:
- `trigger_update_item_stock_on_purchase` - Fires on INSERT
- `trigger_reverse_purchase_stock` - Fires on DELETE
- `trigger_update_purchase_stock` - Fires on UPDATE

### 2. Hook Updates

**File**: `src/hooks/usePurchases.ts`

#### Changes:
- Removed `variant_id` references from purchase creation
- Removed `items` JSON array from purchase data
- Simplified purchase insertion to work directly with items table

#### Before:
```typescript
const itemsArray = [{
  item_id: data.item_id,
  variant_id: data.variantId || null,
  quantity: data.quantity,
  unit_price: data.total_cost / data.quantity
}];

const { data: purchase, error: purchaseError } = await supabase
  .from('purchases')
  .insert([{
    // ... other fields
    items: itemsArray // Add items JSON for variant handling
  }])
```

#### After:
```typescript
const { data: purchase, error: purchaseError } = await supabase
  .from('purchases')
  .insert([{
    // ... other fields
    // No items array needed - triggers handle stock updates
  }])
```

### 3. Component Updates

**Files Updated**:
- `src/components/purchase/RefactoredMultiItemPurchaseForm.tsx`
- `src/components/purchase/PurchaseItemsTable.tsx`

#### Changes:
- Removed `variantId` from `PurchaseItem` interface
- Removed variant-related UI elements
- Simplified form data structure
- Updated table headers to remove variant column

### 4. Type Updates

**File**: `src/types/index.ts`

#### Changes:
- Removed `variant_id` from purchase-related types
- Simplified purchase data structures

## How It Works

### Purchase Flow:
1. User creates a purchase with items and quantities
2. Purchase record is inserted into `purchases` table
3. Trigger `trigger_update_item_stock_on_purchase` fires
4. Function `update_item_stock_on_purchase()` updates the corresponding items:
   - Increases `quantity_available`
   - Recalculates `cost_price` (weighted average)
   - Updates `last_restocked_date`
   - Updates `updated_at` timestamp

### Stock Calculation:
```sql
-- New quantity
quantity_available = quantity_available + NEW.quantity

-- Weighted average cost price
cost_price = ((quantity_available * cost_price) + NEW.total_cost) / (quantity_available + NEW.quantity)
```

### Delete Flow:
1. Purchase is deleted from `purchases` table
2. Trigger `trigger_reverse_purchase_stock` fires
3. Function `reverse_purchase_stock()` decreases item quantities
4. Stock is restored to previous levels

### Update Flow:
1. Purchase is updated (quantity or cost changes)
2. Trigger `trigger_update_purchase_stock` fires
3. Function `update_purchase_stock()` calculates differences
4. Item quantities and costs are adjusted accordingly

## Benefits

### 1. Simplified Data Model
- No more complex variant relationships
- Direct item-to-purchase relationship
- Easier to understand and maintain

### 2. Automatic Stock Management
- Stock updates happen automatically via triggers
- No manual stock calculations needed
- Consistent with sales system behavior

### 3. Better Performance
- Fewer database queries
- No complex JSON operations
- Direct table updates

### 4. Data Integrity
- Foreign key constraints ensure data consistency
- Triggers prevent orphaned records
- Automatic cleanup on deletions

## Migration Notes

### For Existing Data:
- Existing purchases will continue to work
- No data migration needed
- Triggers will handle new purchases correctly

### For Development:
- Remove any remaining `variant_id` references
- Update any custom purchase logic
- Test purchase creation and deletion flows

## Testing

### Test Cases:
1. **Create Purchase**: Verify item quantities increase
2. **Delete Purchase**: Verify item quantities decrease
3. **Update Purchase**: Verify quantities adjust correctly
4. **Cost Calculation**: Verify weighted average cost updates
5. **Multiple Purchases**: Verify cumulative stock updates

### Example Test:
```sql
-- Check item before purchase
SELECT quantity_available, cost_price FROM items WHERE id = 'item-id';

-- Create purchase
INSERT INTO purchases (item_id, quantity, total_cost, ...) VALUES (...);

-- Check item after purchase
SELECT quantity_available, cost_price FROM items WHERE id = 'item-id';
```

## Future Considerations

### Potential Enhancements:
1. **Purchase Categories**: Add category tracking
2. **Supplier Tracking**: Enhanced supplier relationship management
3. **Cost History**: Track cost changes over time
4. **Stock Alerts**: Low stock notifications
5. **Purchase Analytics**: Reporting and insights

### Performance Optimizations:
1. **Batch Operations**: Handle multiple items efficiently
2. **Indexing**: Optimize query performance
3. **Caching**: Reduce database load
4. **Audit Trail**: Track all stock changes

## Troubleshooting

### Common Issues:
1. **Trigger Not Firing**: Check function permissions
2. **Stock Not Updating**: Verify foreign key constraints
3. **Cost Calculation Errors**: Check for division by zero
4. **Performance Issues**: Monitor trigger execution time

### Debug Queries:
```sql
-- Check trigger status
SELECT * FROM information_schema.triggers WHERE event_object_table = 'purchases';

-- Check function permissions
SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'public';

-- Monitor stock changes
SELECT * FROM items WHERE id = 'item-id' ORDER BY updated_at DESC;
``` 