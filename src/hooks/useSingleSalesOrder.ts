import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSingleSalesOrder = (orderId: string | null) => {
  return useQuery({
    queryKey: ['sales-order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      console.log('useSingleSalesOrder: Fetching with orderId:', orderId);
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          sales_order_items (
            id,
            item_id,
            item_name,
            quantity,
            unit_price,
            total_price,
            variant_id
          )
        `)
        .eq('id', orderId)
        .single();
      console.log('useSingleSalesOrder: Supabase response', { data, error });
      if (error) throw error;
      return data;
    },
  });
};
