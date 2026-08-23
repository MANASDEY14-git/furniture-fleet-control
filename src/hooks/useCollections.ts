import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';

export interface ReceivableRow {
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  credit_limit: number;
  open_orders: number;
  total_billed: number;
  total_collected: number;
  outstanding: number;
  oldest_unpaid_date: string | null;
  oldest_age_days: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  last_followup_at: string | null;
  last_note: string | null;
  next_action_date: string | null;
}

export const useReceivablesAging = () => {
  const { activeStoreId } = useStoreContext();

  return useQuery({
    queryKey: ['receivables-aging', activeStoreId],
    queryFn: async (): Promise<ReceivableRow[]> => {
      if (!activeStoreId || activeStoreId === 'all') return [];
      const { data, error } = await (supabase.rpc as any)('get_receivables_aging', {
        _store_id: activeStoreId,
      });
      if (error) throw error;
      return (data || []) as ReceivableRow[];
    },
    enabled: !!activeStoreId && activeStoreId !== 'all',
    staleTime: 60_000,
  });
};

export interface CustomerMoneySummary {
  total_billed: number;
  total_collected: number;
  outstanding: number;
  credit_held: number;
  credit_limit: number;
  open_orders: number;
  last_order_date: string | null;
}

export const useCustomerMoneySummary = (customerId?: string | null) =>
  useQuery({
    queryKey: ['customer-money-summary', customerId],
    queryFn: async (): Promise<CustomerMoneySummary | null> => {
      if (!customerId) return null;
      const { data, error } = await (supabase.rpc as any)('get_customer_money_summary', {
        _customer_id: customerId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as CustomerMoneySummary) ?? null;
    },
    enabled: !!customerId,
    staleTime: 60_000,
  });
