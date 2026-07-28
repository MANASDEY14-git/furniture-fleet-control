import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ItemOpeningBalance {
  id: string;
  item_id: string;
  store_id: string;
  financial_year_id: string;
  opening_quantity: number;
  opening_unit_cost: number;
  opening_value: number;
  effective_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertItemOpeningBalanceData {
  item_id: string;
  store_id: string;
  financial_year_id: string;
  opening_quantity: number;
  opening_unit_cost: number;
  effective_date: string;
  notes?: string;
}

export const useItemOpeningBalances = (itemId?: string, storeId?: string, financialYearId?: string) => {
  return useQuery({
    queryKey: ['item-opening-balances', itemId, storeId, financialYearId],
    queryFn: async () => {
      let query = supabase
        .from('item_opening_balances')
        .select('*');

      if (itemId && itemId !== 'all') {
        query = query.eq('item_id', itemId);
      }
      
      if (storeId && storeId !== 'all') {
        query = query.eq('store_id', storeId);
      }

      if (financialYearId) {
        query = query.eq('financial_year_id', financialYearId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as ItemOpeningBalance[];
    },
  });
};

export const useUpsertItemOpeningBalance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpsertItemOpeningBalanceData) => {
      const { data: result, error } = await supabase
        .from('item_opening_balances')
        .upsert(data, { 
          onConflict: 'item_id,store_id,financial_year_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-opening-balances'] });
      queryClient.invalidateQueries({ queryKey: ['stock-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-ledger-items'] });
      toast({
        title: "Success",
        description: "Item opening balance saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save item opening balance: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
