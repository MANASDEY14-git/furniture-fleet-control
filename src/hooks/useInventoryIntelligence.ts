import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryIntelligenceItem {
  id: string;
  name: string;
  image_url?: string;
  category_id?: string;
  category_name?: string;
  supplier_id?: string;
  supplier_name?: string;
  brand?: string;
  warehouse?: string;
  stock_receive_date?: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  inventory_value: number;
  inventory_cost: number;
  revenue_period: number;
  units_sold_period: number;
  gross_profit_period: number;
  last_sold_date?: string;
  days_since_last_sale?: number;
  avg_days_between_sales?: number;
  stock_age_days: number;
  stock_age_bucket: 'Healthy' | 'Watch' | 'Slow Moving' | 'Dead Stock' | 'Critical';
  monthly_velocity: number;
  days_to_sell: number;
  stock_coverage_days: number;
  reorder_status: 'Reorder Soon' | 'Healthy' | 'Overstocked';
  hero_score: number;
  cash_locked: number;
  recommended_action: 'Clearance Sale' | 'Discount' | 'Bundle' | 'Increase Marketing' | 'Keep Normal';
}

export interface InventoryIntelligenceFilters {
  storeId?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  supplierId?: string;
  brand?: string;
  warehouse?: string;
  ageBucket?: string;
  priceMin?: number;
  priceMax?: number;
}

export function useInventoryIntelligence(filters: InventoryIntelligenceFilters = {}) {
  const storeIdParam = filters.storeId && filters.storeId !== 'all' ? filters.storeId : null;

  return useQuery<InventoryIntelligenceItem[]>({
    queryKey: ['inventory_intelligence', { ...filters, storeId: storeIdParam }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inventory_intelligence', {
        store_id_filter: storeIdParam,
        date_from: filters.dateFrom || null,
        date_to: filters.dateTo || null,
        category_id_filter: filters.categoryId || null,
        supplier_id_filter: filters.supplierId || null,
        brand_filter: filters.brand || null,
        warehouse_filter: filters.warehouse || null,
        age_bucket_filter: filters.ageBucket || null,
        price_min: filters.priceMin !== undefined && filters.priceMin !== null ? filters.priceMin : null,
        price_max: filters.priceMax !== undefined && filters.priceMax !== null ? filters.priceMax : null,
      });

      if (error) {
        console.error('Error fetching inventory intelligence:', error);
        throw error;
      }

      return (data as InventoryIntelligenceItem[]) || [];
    },
    staleTime: 60 * 1000, // 60s per project memory
  });
}
