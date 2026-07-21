import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StockAdjustment {
  id: string;
  item_id: string;
  variant_id?: string;
  store_id: string;
  adjustment_type: 'damaged' | 'theft' | 'physical_count' | 'other';
  quantity_change: number;
  reason?: string;
  notes?: string;
  adjusted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStockAdjustmentData {
  item_id: string;
  variant_id?: string;
  store_id: string;
  adjustment_type: 'damaged' | 'theft' | 'physical_count' | 'other';
  quantity_change: number;
  reason?: string;
  notes?: string;
}

export const useStockAdjustments = (storeId?: string) => {
  return useQuery({
    queryKey: ['stock-adjustments', storeId],
    queryFn: async () => {
      let query = supabase
        .from('stock_adjustments')
        .select('*')
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as StockAdjustment[];
    },
  });
};

export const useCreateStockAdjustment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateStockAdjustmentData) => {
      const { data: adjustment, error } = await supabase
        .from('stock_adjustments')
        .insert([{
          ...data,
          adjusted_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return adjustment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-ledger-items'] });
      toast({
        title: "Success",
        description: "Stock adjustment created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create stock adjustment: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
