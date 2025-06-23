
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Sale } from '@/hooks/useSales';

export const useRecentSales = (selectedStore: string, limit: number = 5) => {
  return useQuery({
    queryKey: ['recent-sales', selectedStore, limit],
    queryFn: async (): Promise<Sale[]> => {
      const storeFilter = selectedStore === 'all' ? {} : { store_id: selectedStore };
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .match(storeFilter)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
};
