import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';

export interface ReorderRow {
  bucket: string;
  item_id: string;
  item_name: string;
  brand: string | null;
  warehouse: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  quantity_available: number;
  units_sold: number;
  weekly_velocity: number;
  weeks_of_cover: number | null;
  suggested_qty: number;
  cost_price: number;
  selling_price: number;
  stock_value: number;
  days_since_sale: number | null;
  last_sale_date: string | null;
}

export const useReorderIntelligence = (windowDays = 90) => {
  const { activeStoreId } = useStoreContext();

  return useQuery({
    queryKey: ['reorder-intelligence', activeStoreId, windowDays],
    queryFn: async (): Promise<ReorderRow[]> => {
      if (!activeStoreId || activeStoreId === 'all') return [];
      const { data, error } = await supabase.rpc('get_reorder_intelligence', {
        _store_id: activeStoreId,
        _window_days: windowDays,
      });
      if (error) throw error;
      return (data || []) as ReorderRow[];
    },
    enabled: !!activeStoreId && activeStoreId !== 'all',
    staleTime: 60_000,
  });
};
