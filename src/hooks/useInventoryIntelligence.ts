import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryIntelligenceRow {
  item_id: string;
  /** Alias of item_id for UI convenience */
  id: string;
  item_name: string;
  /** Alias of item_name for UI convenience */
  name: string;
  category_id: string | null;
  category_name: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  store_id: string;
  store_name: string | null;
  brand: string | null;
  warehouse: string | null;
  image_url: string | null;
  stock_receive_date: string | null;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  inventory_value: number;
  inventory_cost: number;
  units_sold_period: number;
  revenue_period: number;
  gross_profit_period: number;
  last_sold_date: string | null;
  days_since_last_sale: number | null;
  stock_age_days: number | null;
  stock_age_bucket:
    | 'Healthy'
    | 'Watch'
    | 'Slow Moving'
    | 'Dead Stock'
    | 'Critical'
    | 'Unknown';
  monthly_velocity: number;
  days_to_sell: number | null;
  reorder_status: 'Reorder Soon' | 'Healthy' | 'Overstocked' | 'Stale';
  hero_score: number;
  cash_locked: number;
  recommended_action:
    | 'Keep Normal'
    | 'Increase Marketing'
    | 'Bundle Product'
    | 'Discount'
    | 'Clearance Sale';
}

export interface InventoryFiltersState {
  storeId?: string | null;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string | null;
  supplierId?: string | null;
  brand?: string | null;
  warehouse?: string | null;
  ageMinDays?: number | null;
  ageMaxDays?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  /** UI-only bucket filter (Healthy/Watch/Slow Moving/Dead Stock/Critical/all) */
  ageBucket?: string | null;
}

export interface InventoryFiltersState {
  storeId?: string | null;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string | null;
  supplierId?: string | null;
  brand?: string | null;
  warehouse?: string | null;
  ageMinDays?: number | null;
  ageMaxDays?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
}

// Aliases used by the inventory-intelligence UI components
export type InventoryIntelligenceItem = InventoryIntelligenceRow;
export type InventoryIntelligenceFilters = InventoryFiltersState;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function useInventoryIntelligence(filters: InventoryFiltersState) {
  const today = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(today.getDate() - 180);

  const dateFrom = filters.dateFrom ?? isoDate(defaultFrom);
  const dateTo = filters.dateTo ?? isoDate(today);
  const storeId = filters.storeId && filters.storeId !== 'all' ? filters.storeId : null;

  return useQuery({
    queryKey: [
      'inventory-intelligence',
      storeId,
      dateFrom,
      dateTo,
      filters.categoryId,
      filters.supplierId,
      filters.brand,
      filters.warehouse,
      filters.ageMinDays,
      filters.ageMaxDays,
      filters.priceMin,
      filters.priceMax,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inventory_intelligence' as never, {
        p_store_id: storeId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
        p_category_id: filters.categoryId || null,
        p_supplier_id: filters.supplierId || null,
        p_brand: filters.brand || null,
        p_warehouse: filters.warehouse || null,
        p_age_min_days: filters.ageMinDays ?? null,
        p_age_max_days: filters.ageMaxDays ?? null,
        p_price_min: filters.priceMin ?? null,
        p_price_max: filters.priceMax ?? null,
      } as never);

      if (error) {
        console.error('[inventory-intelligence]', error);
        throw error;
      }

      const rows = (data ?? []) as unknown as Array<
        Omit<InventoryIntelligenceRow, 'id' | 'name'>
      >;
      // Populate id/name aliases for UI convenience
      let filtered = rows.map((r) => ({
        ...r,
        id: r.item_id,
        name: r.item_name,
      })) as InventoryIntelligenceRow[];

      if (filters.ageBucket && filters.ageBucket !== 'all') {
        filtered = filtered.filter((r) => r.stock_age_bucket === filters.ageBucket);
      }

      return filtered;
    },
    staleTime: 60 * 1000,
  });
}
