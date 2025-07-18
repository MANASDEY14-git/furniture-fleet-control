import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSingleSalesOrder = (orderId: string | null) => {
  return useQuery({
    queryKey: ['sales-order', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return null;
      
      console.log('Fetching order with ID:', orderId);
      
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          sales_order_items(*)
        `)
        .eq('id', orderId)
        .single();
        
      console.log('Order query result:', { data, error });
      
      if (error) throw error;
      return data;
    },
  });
};
