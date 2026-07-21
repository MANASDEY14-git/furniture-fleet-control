import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderMaterialUsage {
  id: string;
  sales_order_item_id: string;
  material_id: string | null;
  material_name: string | null;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  source: string;
  created_at: string;
}

export interface OrderBOMSnapshot {
  id: string;
  sales_order_item_id: string;
  bom_id: string | null;
  bom_name: string | null;
  bom_version: number | null;
  snapshot_json: any;
  created_at: string;
}

export interface OrderMaterialCost {
  sales_order_id: string | null;
  order_number: string | null;
  order_total: number | null;
  total_material_cost: number | null;
  margin: number | null;
}

export const useOrderMaterialUsage = (orderId: string | null) => {
  return useQuery({
    queryKey: ['order-material-usage', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return [];

      // Get order item IDs first
      const { data: items, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('id, item_name, quantity')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      if (!items || items.length === 0) return [];

      const itemIds = items.map(i => i.id);

      const { data, error } = await supabase
        .from('sales_order_material_usage')
        .select('*')
        .in('sales_order_item_id', itemIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Attach item info for grouping
      return (data || []).map(row => ({
        ...row,
        _itemName: items.find(i => i.id === row.sales_order_item_id)?.item_name || 'Unknown',
        _itemQty: items.find(i => i.id === row.sales_order_item_id)?.quantity || 0,
      }));
    },
  });
};

export const useOrderBOMSnapshots = (orderId: string | null) => {
  return useQuery({
    queryKey: ['order-bom-snapshots', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return [];

      const { data: items, error: itemsError } = await supabase
        .from('sales_order_items')
        .select('id')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;
      if (!items || items.length === 0) return [];

      const itemIds = items.map(i => i.id);

      const { data, error } = await supabase
        .from('sales_order_bom_snapshot')
        .select('*')
        .in('sales_order_item_id', itemIds);

      if (error) throw error;
      return (data || []) as OrderBOMSnapshot[];
    },
  });
};

export const useOrderMaterialCost = (orderId: string | null) => {
  return useQuery({
    queryKey: ['order-material-cost', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from('sales_order_material_cost')
        .select('*')
        .eq('sales_order_id', orderId)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as OrderMaterialCost | null;
    },
  });
};
