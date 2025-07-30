# Stock Triggers Implementation

## Overview
This document explains the comprehensive implementation of stock management triggers that automatically update item quantities when purchases and sales occur.

## 🔧 **Migration Applied**
- **File**: `20250730070000_fix_stock_triggers_comprehensive.sql`
- **Purpose**: Fixes all stock-related triggers and ensures they work properly

## 📋 **What the Migration Does**

### 1. **Cleans Up Existing Triggers**
- Drops all existing stock-related triggers and functions
- Ensures no conflicts with old implementations

### 2. **Creates Purchase Stock Update Function**
```sql
update_item_stock_on_purchase()
```
- **Trigger**: `AFTER INSERT ON purchases`
- **Action**: Adds quantity to `items.quantity_available`
- **Also Updates**: `cost_price`, `last_restocked_date`, `updated_at`

### 3. **Creates Sales Stock Deduction Function**
```sql
handle_sales_stock_deduction()
```
- **Trigger**: `AFTER INSERT ON sales_order_items`
- **Action**: Deducts quantity from `items.quantity_available`
- **Safety**: Uses `GREATEST(0, ...)` to prevent negative stock

### 4. **Creates Direct Sales Stock Deduction Function**
```sql
deduct_item_stock_on_sale()
```
- **Trigger**: `AFTER INSERT ON sales`
- **Action**: Deducts quantity from `items.quantity_available`
- **Safety**: Uses `GREATEST(0, ...)` to prevent negative stock

### 5. **Creates Reverse Functions for DELETE Operations**
- `reverse_purchase_stock()` - Removes stock when purchase is deleted
- `reverse_sales_stock_deduction()` - Adds back stock when sales order item is deleted
- `reverse_sale_stock()` - Adds back stock when direct sale is deleted

### 6. **Sets Up All Triggers**
- 6 triggers total (3 for INSERT, 3 for DELETE)
- Proper permissions granted to `authenticated` users
- Debug logging included for troubleshooting

## 🧪 **Testing the Implementation**

### **Step 1: Apply the Migration**
```bash
npx supabase db push
```

### **Step 2: Run the Test Script**
Copy and paste the contents of `test_stock_triggers.sql` into your Supabase SQL Editor and run it.

### **Step 3: Manual Testing**

#### **Test Purchase Stock Addition**
1. Go to **Purchases** page
2. Create a new purchase with any item
3. Check the **Inventory** page
4. Verify the item quantity increased

#### **Test Sales Stock Deduction**
1. Go to **Sales** page
2. Create a new sales order with any item
3. Check the **Inventory** page
4. Verify the item quantity decreased

## 🔍 **Debugging Features**

### **Debug Logging**
All functions include `RAISE NOTICE` statements that log:
- Purchase trigger updates
- Sales trigger deductions
- Reverse operations

### **Check Trigger Status**
```sql
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name LIKE '%stock%' 
AND trigger_schema = 'public';
```

### **Check Function Status**
```sql
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%stock%'
AND routine_schema = 'public';
```

## 📊 **Expected Behavior**

### **Purchase Flow**
1. User creates purchase in frontend
2. `purchases` table gets new record
3. `trigger_update_item_stock_on_purchase` fires
4. `items.quantity_available` increases by purchase quantity
5. `items.cost_price` recalculated (weighted average)
6. `items.last_restocked_date` updated

### **Sales Flow**
1. User creates sales order in frontend
2. `sales_order_items` table gets new record
3. `trigger_handle_sales_stock_deduction` fires
4. `items.quantity_available` decreases by sale quantity
5. Stock cannot go below 0 (safety feature)

### **Delete Operations**
- Deleting a purchase removes the added stock
- Deleting a sales order item adds back the deducted stock
- Deleting a direct sale adds back the deducted stock

## 🛡️ **Safety Features**

1. **No Negative Stock**: `GREATEST(0, quantity_available - quantity)`
2. **Proper Permissions**: All functions granted to `authenticated` users
3. **Error Handling**: Functions include proper error checking
4. **Debug Logging**: All operations logged for troubleshooting

## 🔧 **Troubleshooting**

### **If Stock Updates Don't Work**

1. **Check Trigger Status**:
   ```sql
   SELECT trigger_name, event_object_table, event_manipulation 
   FROM information_schema.triggers 
   WHERE trigger_name LIKE '%stock%';
   ```

2. **Check Function Permissions**:
   ```sql
   SELECT routine_name, routine_type 
   FROM information_schema.routines 
   WHERE routine_name LIKE '%stock%';
   ```

3. **Check Item Quantities**:
   ```sql
   SELECT id, name, quantity_available, updated_at 
   FROM items 
   ORDER BY updated_at DESC;
   ```

4. **Run Test Script**: Use `test_stock_triggers.sql` to verify functionality

### **Common Issues**

1. **Permission Denied**: Ensure functions are granted to `authenticated` users
2. **Trigger Not Firing**: Check if triggers are properly created
3. **Function Errors**: Check PostgreSQL logs for error messages
4. **Data Issues**: Ensure `item_id` exists in `items` table

## ✅ **Success Indicators**

- ✅ Purchase creates increase item quantity
- ✅ Sales order creates decrease item quantity
- ✅ Direct sales decrease item quantity
- ✅ Delete operations reverse stock changes
- ✅ No negative stock values
- ✅ Debug logs appear in PostgreSQL logs

## 📝 **Notes**

- All functions use `SECURITY DEFINER` for proper permissions
- Debug logging helps track trigger execution
- Test script provides comprehensive verification
- Migration includes automatic testing
- Schema reload ensures all changes are applied

The stock management system should now work perfectly with automatic updates on all purchase and sales operations! 