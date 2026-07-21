# Removing Item Variants Triggers

This document explains how to remove all triggers from the `item_variants` table in your Supabase database.

## Background

The `item_variants` table had several triggers that were used to:
- Update the `updated_at` timestamp automatically
- Sync quantities between parent items and variants
- Maintain data consistency

These triggers have been removed as part of the system simplification.

## Files Created

1. **Migration File**: `supabase/migrations/20250730053905_remove_item_variants_triggers.sql`
   - This is a proper Supabase migration that will be applied when you run migrations
   - Contains all the DROP TRIGGER statements

2. **Standalone Script**: `remove_item_variants_triggers.sql`
   - This can be run directly in your database
   - Includes diagnostic queries to check what triggers exist
   - Has a dynamic section that will drop any remaining triggers

## How to Apply

### Option 1: Using Supabase Migrations (Recommended)
```bash
# Apply the migration
npx supabase db push

# Or if you want to reset the database
npx supabase db reset
```

### Option 2: Running the Standalone Script
1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `remove_item_variants_triggers.sql`
4. Run the script

## Triggers That Were Removed

Based on the migration history, these triggers were removed:

1. `update_item_variants_updated_at` - Updated the `updated_at` column
2. `update_parent_item_quantity_trigger` - Synced quantities with parent items
3. `update_parent_item_quantity_v2_trigger` - Alternative sync trigger
4. `trigger_sync_parent_quantity` - Another sync trigger
5. `sync_parent_item_quantity` - Yet another sync trigger

## Verification

After running the migration or script, you can verify that all triggers are removed by running:

```sql
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'item_variants' 
AND trigger_schema = 'public';
```

This query should return no results if all triggers have been successfully removed.

## Notes

- The `item_variants` table itself was also dropped in recent migrations
- This migration is a safety measure to ensure any remaining triggers are cleaned up
- The script includes CASCADE drops to remove any dependent functions
- A schema reload is triggered to ensure PostgREST picks up the changes 