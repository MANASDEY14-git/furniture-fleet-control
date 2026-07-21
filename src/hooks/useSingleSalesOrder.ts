import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SalesOrderItem {
  id: string;
  order_id: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier_id: string | null;
  variant_id: string | null;
  stock_deducted: boolean | null;
  created_at: string;
}

interface SecureSalesOrder {
  id: string;
  order_number: string;
  store_id: string | null;
  supplier_id: string | null;
  date: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  delivery_status: string;
  advance_paid: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  description: string | null;
  status: string | null;
  balance_due: number | null;
  delivered_at: string | null;
  delivery_date: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  sales_order_items: SalesOrderItem[];
}

export const useSingleSalesOrder = (orderId: string | null) => {
  return useQuery({
    queryKey: ['sales-order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase.rpc('get_sales_order_for_user', {
        _order_id: orderId
      });
      
      if (error) throw error;
      
      // RPC returns an array, get first row or null
      if (!data || data.length === 0) return null;
      
      const row = data[0];
      
      // Parse sales_order_items from JSON
      const items = Array.isArray(row.sales_order_items) 
        ? row.sales_order_items as unknown as SalesOrderItem[]
        : [];
      
      // Transform the result to match expected shape
      return {
        id: row.id,
        order_number: row.order_number,
        store_id: row.store_id,
        supplier_id: row.supplier_id,
        date: row.date,
        total_amount: row.total_amount,
        created_at: row.created_at,
        updated_at: row.updated_at,
        delivery_status: row.delivery_status,
        advance_paid: row.advance_paid,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        customer_address: row.customer_address,
        description: row.description,
        status: row.status,
        balance_due: row.balance_due,
        delivered_at: row.delivered_at,
        delivery_date: row.delivery_date,
        cancelled_at: row.cancelled_at,
        cancellation_reason: row.cancellation_reason,
        sales_order_items: items
      } as SecureSalesOrder;
    },
  });
};
