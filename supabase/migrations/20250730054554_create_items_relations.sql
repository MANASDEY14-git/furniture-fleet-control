-- Create proper relations with the items table
-- This migration establishes foreign key constraints for data integrity

-- First, let's check if the items table exists and has the correct structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'items' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Items table does not exist';
    END IF;
END $$;

-- 1. Establish foreign key relationship for sales_order_items table
-- Check if sales_order_items table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_order_items' AND table_schema = 'public') THEN
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_sales_order_items_item_id' 
            AND table_name = 'sales_order_items'
        ) THEN
            ALTER TABLE public.sales_order_items 
            ADD CONSTRAINT fk_sales_order_items_item_id 
            FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 2. Establish foreign key relationship for purchases table
-- Check if purchases table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchases' AND table_schema = 'public') THEN
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_purchases_item_id' 
            AND table_name = 'purchases'
        ) THEN
            ALTER TABLE public.purchases 
            ADD CONSTRAINT fk_purchases_item_id 
            FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 3. Establish foreign key relationship for sales table
-- Check if sales table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales' AND table_schema = 'public') THEN
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_sales_item_id' 
            AND table_name = 'sales'
        ) THEN
            ALTER TABLE public.sales 
            ADD CONSTRAINT fk_sales_item_id 
            FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 4. Establish foreign key relationship for low_stock_alerts table
-- Check if low_stock_alerts table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'low_stock_alerts' AND table_schema = 'public') THEN
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_low_stock_alerts_item_id' 
            AND table_name = 'low_stock_alerts'
        ) THEN
            ALTER TABLE public.low_stock_alerts 
            ADD CONSTRAINT fk_low_stock_alerts_item_id 
            FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 5. Create indexes for better performance on foreign key columns
CREATE INDEX IF NOT EXISTS idx_sales_order_items_item_id ON public.sales_order_items(item_id);
CREATE INDEX IF NOT EXISTS idx_purchases_item_id ON public.purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_item_id ON public.sales(item_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_alerts_item_id ON public.low_stock_alerts(item_id);

-- 6. Add RLS policies for related tables to ensure proper access control
-- Sales order items RLS policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_order_items' AND table_schema = 'public') THEN
        ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can access sales order items for their stores" ON public.sales_order_items;
        CREATE POLICY "Users can access sales order items for their stores"
        ON public.sales_order_items
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM public.sales_orders so
                JOIN public.items i ON so.id = sales_order_items.order_id
                WHERE user_has_store_access(i.store_id)
            )
        );
    END IF;
END $$;

-- Purchases RLS policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchases' AND table_schema = 'public') THEN
        ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can access purchases for their stores" ON public.purchases;
        CREATE POLICY "Users can access purchases for their stores"
        ON public.purchases
        FOR ALL
        USING (user_has_store_access(store_id));
    END IF;
END $$;

-- Sales RLS policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales' AND table_schema = 'public') THEN
        ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can access sales for their stores" ON public.sales;
        CREATE POLICY "Users can access sales for their stores"
        ON public.sales
        FOR ALL
        USING (user_has_store_access(store_id));
    END IF;
END $$;

-- Low stock alerts RLS policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'low_stock_alerts' AND table_schema = 'public') THEN
        ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can access low stock alerts for their stores" ON public.low_stock_alerts;
        CREATE POLICY "Users can access low stock alerts for their stores"
        ON public.low_stock_alerts
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM public.items i
                WHERE i.id = low_stock_alerts.item_id
                AND user_has_store_access(i.store_id)
            )
        );
    END IF;
END $$;

-- 7. Create a view for items with their related data
CREATE OR REPLACE VIEW public.items_with_relations AS
SELECT 
    i.id,
    i.name,
    i.category_id,
    i.store_id,
    i.supplier_id,
    i.quantity_available,
    i.cost_price,
    i.selling_price,
    i.stock_receive_date,
    i.last_restocked_date,
    i.created_at,
    i.updated_at,
    -- Related data counts
    COALESCE(sales_count.count, 0) as total_sales,
    COALESCE(purchases_count.count, 0) as total_purchases,
    COALESCE(sales_orders_count.count, 0) as total_sales_orders,
    -- Latest activity
    GREATEST(
        COALESCE(i.updated_at, '1900-01-01'::timestamp),
        COALESCE(latest_sales.max_date, '1900-01-01'::timestamp),
        COALESCE(latest_purchases.max_date, '1900-01-01'::timestamp)
    ) as last_activity_date
FROM public.items i
LEFT JOIN (
    SELECT item_id, COUNT(*) as count
    FROM public.sales
    GROUP BY item_id
) sales_count ON i.id = sales_count.item_id
LEFT JOIN (
    SELECT item_id, COUNT(*) as count
    FROM public.purchases
    GROUP BY item_id
) purchases_count ON i.id = purchases_count.item_id
LEFT JOIN (
    SELECT soi.item_id, COUNT(*) as count
    FROM public.sales_order_items soi
    GROUP BY soi.item_id
) sales_orders_count ON i.id = sales_orders_count.item_id
LEFT JOIN (
    SELECT item_id, MAX(created_at) as max_date
    FROM public.sales
    GROUP BY item_id
) latest_sales ON i.id = latest_sales.item_id
LEFT JOIN (
    SELECT item_id, MAX(created_at) as max_date
    FROM public.purchases
    GROUP BY item_id
) latest_purchases ON i.id = latest_purchases.item_id;

-- Grant permissions on the view
GRANT SELECT ON public.items_with_relations TO authenticated;

-- 8. Create a function to get item statistics
CREATE OR REPLACE FUNCTION public.get_item_statistics(p_item_id uuid)
RETURNS TABLE(
    total_sales numeric,
    total_purchases numeric,
    total_sales_orders integer,
    average_selling_price numeric,
    average_cost_price numeric,
    profit_margin numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(sales_stats.total_amount, 0) as total_sales,
        COALESCE(purchases_stats.total_amount, 0) as total_purchases,
        COALESCE(sales_orders_stats.count, 0) as total_sales_orders,
        COALESCE(sales_stats.avg_price, 0) as average_selling_price,
        COALESCE(purchases_stats.avg_cost, 0) as average_cost_price,
        CASE 
            WHEN COALESCE(sales_stats.total_amount, 0) > 0 
            THEN ((COALESCE(sales_stats.total_amount, 0) - COALESCE(purchases_stats.total_amount, 0)) / COALESCE(sales_stats.total_amount, 1)) * 100
            ELSE 0
        END as profit_margin
    FROM public.items i
    LEFT JOIN (
        SELECT 
            item_id,
            SUM(total_price) as total_amount,
            AVG(total_price / quantity) as avg_price
        FROM public.sales
        WHERE item_id = p_item_id
        GROUP BY item_id
    ) sales_stats ON i.id = sales_stats.item_id
    LEFT JOIN (
        SELECT 
            item_id,
            SUM(total_cost) as total_amount,
            AVG(total_cost / quantity) as avg_cost
        FROM public.purchases
        WHERE item_id = p_item_id
        GROUP BY item_id
    ) purchases_stats ON i.id = purchases_stats.item_id
    LEFT JOIN (
        SELECT 
            item_id,
            COUNT(*) as count
        FROM public.sales_order_items
        WHERE item_id = p_item_id
        GROUP BY item_id
    ) sales_orders_stats ON i.id = sales_orders_stats.item_id
    WHERE i.id = p_item_id;
END;
$$;

-- Grant permissions on the function
GRANT EXECUTE ON FUNCTION public.get_item_statistics(uuid) TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
