import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSingleSalesOrder = (orderId: string | null) => {
  return useQuery({
    queryKey: ['sales-order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          sales_order_items(id,item_id,item_name,quantity,unit_price,total_price,variant_id)
        `)
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
  });
};
