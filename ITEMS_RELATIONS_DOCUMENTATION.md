# Items Table Relations

This document explains the foreign key relationships established with the `items` table in your Supabase database.

## Overview

The `items` table is the central entity in the furniture fleet control system. It contains all inventory items and serves as the primary reference for sales, purchases, and other business operations.

## Foreign Key Relationships

### 1. Sales Order Items (`sales_order_items`)
- **Foreign Key**: `item_id` → `items.id`
- **Constraint**: `fk_sales_order_items_item_id`
- **Cascade**: ON DELETE CASCADE
- **Purpose**: Links sales order line items to their corresponding inventory items
- **Index**: `idx_sales_order_items_item_id`

### 2. Purchases (`purchases`)
- **Foreign Key**: `item_id` → `items.id`
- **Constraint**: `fk_purchases_item_id`
- **Cascade**: ON DELETE CASCADE
- **Purpose**: Links purchase records to their corresponding inventory items
- **Index**: `idx_purchases_item_id`

### 3. Sales (`sales`)
- **Foreign Key**: `item_id` → `items.id`
- **Constraint**: `fk_sales_item_id`
- **Cascade**: ON DELETE CASCADE
- **Purpose**: Links sales records to their corresponding inventory items
- **Index**: `idx_sales_item_id`

### 4. Low Stock Alerts (`low_stock_alerts`)
- **Foreign Key**: `item_id` → `items.id`
- **Constraint**: `fk_low_stock_alerts_item_id`
- **Cascade**: ON DELETE CASCADE
- **Purpose**: Links low stock alerts to their corresponding inventory items
- **Index**: `idx_low_stock_alerts_item_id`

## Row Level Security (RLS) Policies

### Sales Order Items
- **Policy**: "Users can access sales order items for their stores"
- **Logic**: Users can only access sales order items for stores they have access to
- **Implementation**: Checks store access through the items table

### Purchases
- **Policy**: "Users can access purchases for their stores"
- **Logic**: Users can only access purchases for stores they have access to
- **Implementation**: Direct store access check

### Sales
- **Policy**: "Users can access sales for their stores"
- **Logic**: Users can only access sales for stores they have access to
- **Implementation**: Direct store access check

### Low Stock Alerts
- **Policy**: "Users can access low stock alerts for their stores"
- **Logic**: Users can only access low stock alerts for items in stores they have access to
- **Implementation**: Checks store access through the items table

## Views and Functions

### Items with Relations View (`items_with_relations`)
This view provides a comprehensive view of items with their related data:

```sql
SELECT * FROM public.items_with_relations;
```

**Columns included:**
- All original item fields
- `total_sales`: Count of sales records
- `total_purchases`: Count of purchase records
- `total_sales_orders`: Count of sales order items
- `last_activity_date`: Most recent activity date

### Item Statistics Function (`get_item_statistics`)
This function provides detailed statistics for a specific item:

```sql
SELECT * FROM public.get_item_statistics('item-uuid-here');
```

**Returns:**
- `total_sales`: Total sales amount
- `total_purchases`: Total purchase amount
- `total_sales_orders`: Count of sales orders
- `average_selling_price`: Average selling price
- `average_cost_price`: Average cost price
- `profit_margin`: Calculated profit margin percentage

## Data Integrity Benefits

### 1. Referential Integrity
- Ensures that all references to items are valid
- Prevents orphaned records
- Automatic cleanup when items are deleted

### 2. Performance Optimization
- Indexes on foreign key columns improve query performance
- Efficient joins between related tables
- Better query planning by the database optimizer

### 3. Security
- Row Level Security ensures users only see data for their stores
- Proper access control at the database level
- Consistent security policies across all related tables

## Usage Examples

### Get Items with Sales Data
```sql
SELECT 
    i.name,
    i.quantity_available,
    COUNT(s.id) as sales_count,
    SUM(s.total_price) as total_sales_amount
FROM items i
LEFT JOIN sales s ON i.id = s.item_id
GROUP BY i.id, i.name, i.quantity_available;
```

### Get Items with Purchase History
```sql
SELECT 
    i.name,
    i.cost_price,
    COUNT(p.id) as purchase_count,
    AVG(p.total_cost / p.quantity) as avg_purchase_price
FROM items i
LEFT JOIN purchases p ON i.id = p.item_id
GROUP BY i.id, i.name, i.cost_price;
```

### Get Low Stock Items with Alert History
```sql
SELECT 
    i.name,
    i.quantity_available,
    COUNT(lsa.id) as alert_count,
    MAX(lsa.created_at) as last_alert_date
FROM items i
LEFT JOIN low_stock_alerts lsa ON i.id = lsa.item_id
WHERE i.quantity_available < 10
GROUP BY i.id, i.name, i.quantity_available;
```

## Migration Details

The relations were established in migration `20250730054554_create_items_relations.sql` which:

1. **Checks for table existence** before creating constraints
2. **Uses conditional logic** to avoid errors if tables don't exist
3. **Creates indexes** for performance optimization
4. **Establishes RLS policies** for security
5. **Creates views and functions** for enhanced functionality
6. **Forces schema reload** to ensure PostgREST picks up changes

## Maintenance

### Adding New Relations
To add a new table that references items:

1. Add the foreign key constraint
2. Create an index on the foreign key column
3. Add appropriate RLS policy
4. Update the `items_with_relations` view if needed

### Monitoring Relations
You can monitor the health of relations using:

```sql
-- Check for orphaned records
SELECT 'sales' as table_name, COUNT(*) as orphaned_count
FROM sales s
LEFT JOIN items i ON s.item_id = i.id
WHERE i.id IS NULL
UNION ALL
SELECT 'purchases', COUNT(*)
FROM purchases p
LEFT JOIN items i ON p.item_id = i.id
WHERE i.id IS NULL;
```

This ensures data integrity and helps identify any issues with the relations. 