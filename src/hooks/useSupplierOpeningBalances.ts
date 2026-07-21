import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupplierOpeningBalance {
  id: string;
  supplier_id: string;
  store_id: string;
  opening_balance: number;
  balance_type: 'debit' | 'credit';
  effective_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOpeningBalanceData {
  supplier_id: string;
  store_id: string;
  opening_balance: number;
  balance_type: 'debit' | 'credit';
  effective_date: string;
  notes?: string;
}

export const useSupplierOpeningBalances = (supplierId?: string, storeId?: string) => {
  return useQuery({
    queryKey: ['supplier-opening-balances', supplierId, storeId],
    queryFn: async () => {
      let query = supabase
        .from('supplier_opening_balances')
        .select('*')
        .order('created_at', { ascending: false });

      if (supplierId && supplierId !== 'all') {
        query = query.eq('supplier_id', supplierId);
      }
      
      if (storeId && storeId !== 'all') {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as SupplierOpeningBalance[];
    },
  });
};

export const useUpsertOpeningBalance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateOpeningBalanceData) => {
      // Use upsert to handle both insert and update
      const { data: result, error } = await supabase
        .from('supplier_opening_balances')
        .upsert(data, { 
          onConflict: 'supplier_id,store_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-opening-balances'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balances'] });
      toast({
        title: "Success",
        description: "Opening balance saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save opening balance: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteOpeningBalance = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('supplier_opening_balances')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-opening-balances'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balances'] });
      toast({
        title: "Success",
        description: "Opening balance deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete opening balance: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
