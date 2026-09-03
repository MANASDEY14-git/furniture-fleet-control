import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';

export interface ReorderRow {
  item_id: string;
  item_name: string;
  brand: string | null;
  warehouse: string | null;
  category_id: string | null;
  category_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;

  // Demand facts
  units_sold_30d: number;
  units_sold_90d: number;
  units_sold_365d: number;
  orders_count_30d: number;
  orders_count_90d: number;
  orders_count_365d: number;
  orders_count_ever: number;
  first_sale_date: string | null;
  last_sale_date: string | null;
  days_since_last_sale: number | null;
  selling_months_count: number;
  avg_units_per_order: number;

  // Demand class & estimation
  demand_class: 'no_history' | 'one_off' | 'intermittent' | 'steady';
  confidence: 'high' | 'medium' | 'low';
  demand_rate_basis: 'own history' | 'category benchmark';
  estimated_monthly_demand: number;
  category_monthly_rate: number;

  // Replenishment facts
  current_stock: number;
  open_demand: number;
  net_stock: number;
  cost_price: number;
  selling_price: number;
  stock_value: number;
  supplier_lead_days: number;
  last_purchase_date: string | null;
  days_held: number;

  // Decision & suggestion
  decision: 'reorder_now' | 'reorder_soon' | 'sell_through' | 'dead_stock' | 'never_sold';
  lead_time_demand: number;
  cover_days: number | null;
  suggested_qty: number;
  suggested_order_cost: number;
  evidence_sentence: string;

  // Backward-compatibility aliases
  bucket: string;
  quantity_available: number;
  units_sold: number;
  days_since_sale: number | null;
}

export const useReorderIntelligence = (windowDays = 365, horizonDays: number | null = null) => {
  const { activeStoreId } = useStoreContext();

  return useQuery({
    queryKey: ['reorder-intelligence', activeStoreId, windowDays, horizonDays],
    queryFn: async (): Promise<ReorderRow[]> => {
      if (!activeStoreId || activeStoreId === 'all') return [];
      const { data, error } = await supabase.rpc('get_reorder_intelligence', {
        _store_id: activeStoreId,
        _window_days: windowDays,
        _horizon_days: horizonDays,
      });
      if (error) throw error;
      return (data || []) as unknown as ReorderRow[];
    },
    enabled: !!activeStoreId && activeStoreId !== 'all',
    staleTime: 60_000,
  });
};
