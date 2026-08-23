import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';

export type DispatchBucket = 'overdue' | 'today' | 'this_week' | 'later' | 'unscheduled';

export interface DispatchRow {
  order_id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  order_date: string;
  delivery_date: string | null;
  delivery_status: string;
  total_amount: number;
  balance_due: number;
  items_count: number;
  bucket: DispatchBucket;
  days_overdue: number;
}

export const useDispatchBoard = () => {
  const { activeStoreId } = useStoreContext();

  return useQuery({
    queryKey: ['dispatch-board', activeStoreId],
    queryFn: async (): Promise<DispatchRow[]> => {
      if (!activeStoreId || activeStoreId === 'all') return [];
      const { data, error } = await (supabase.rpc as any)('get_dispatch_board', {
        _store_id: activeStoreId,
      });
      if (error) throw error;
      return (data || []) as DispatchRow[];
    },
    enabled: !!activeStoreId && activeStoreId !== 'all',
    staleTime: 60_000,
  });
};

export interface DeliveryPerformanceRow {
  month: string;
  delivered_count: number;
  on_time_count: number;
  late_count: number;
  on_time_rate: number | null;
  avg_delay_days: number | null;
}

export const useDeliveryPerformance = (months = 6) => {
  const { activeStoreId } = useStoreContext();

  return useQuery({
    queryKey: ['delivery-performance', activeStoreId, months],
    queryFn: async (): Promise<DeliveryPerformanceRow[]> => {
      if (!activeStoreId || activeStoreId === 'all') return [];
      const { data, error } = await (supabase.rpc as any)('get_delivery_performance', {
        _store_id: activeStoreId,
        _months: months,
      });
      if (error) throw error;
      return (data || []) as DeliveryPerformanceRow[];
    },
    enabled: !!activeStoreId && activeStoreId !== 'all',
    staleTime: 60_000,
  });
};
