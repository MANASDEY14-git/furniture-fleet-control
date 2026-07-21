
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardMetrics } from '@/types';

export const useDashboardMetrics = (selectedStore: string) => {
  return useQuery({
    queryKey: ['dashboard-metrics', selectedStore],
    queryFn: async (): Promise<DashboardMetrics> => {
      const today = new Date().toISOString().split('T')[0];
      
      // Build store filter condition
      const storeFilter = selectedStore === 'all' ? {} : { store_id: selectedStore };
      
      // Get today's sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total_price')
        .match(storeFilter)
        .eq('date', today);
      
      if (salesError) throw salesError;
      
      const totalSalesToday = salesData?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;
      
      // Get inventory value
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('quantity_available, cost_price')
        .match(selectedStore === 'all' ? {} : { store_id: selectedStore });
      
      if (itemsError) throw itemsError;
      
      const totalStockValue = itemsData?.reduce((sum, item) => 
        sum + (Number(item.quantity_available) * Number(item.cost_price)), 0) || 0;
      
      // Get today's payments received
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .match(storeFilter)
        .eq('type', 'Receipt')
        .eq('date', today);
      
      if (paymentsError) throw paymentsError;
      
      const paymentsReceived = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      
      // Get pending deliveries
      const { data: pendingSalesData, error: pendingSalesError } = await supabase
        .from('sales')
        .select('id')
        .match(storeFilter)
        .eq('delivery_status', 'Pending');
      
      if (pendingSalesError) throw pendingSalesError;
      
      const pendingDeliveries = pendingSalesData?.length || 0;
      
      return {
        totalSalesToday,
        totalStockValue,
        paymentsReceived,
        pendingDeliveries,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
};
