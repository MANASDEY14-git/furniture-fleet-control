
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Purchase {
  id: string;
  store_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_cost: number;
  date: string;
  created_at: string;
}

export interface CreatePurchaseData {
  store_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_cost: number;
  date: string;
}

export const usePurchases = () => {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Purchase[];
    },
  });
};

export const useCreatePurchase = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePurchaseData) => {
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert([data])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Update item quantity by adding the purchased quantity
      const { data: currentItem, error: fetchError } = await supabase
        .from('items')
        .select('quantity_available')
        .eq('id', data.item_id)
        .single();

      if (fetchError) {
        // If fetching current item fails, rollback the purchase
        await supabase.from('purchases').delete().eq('id', purchase.id);
        throw fetchError;
      }

      const { error: updateError } = await supabase
        .from('items')
        .update({ 
          quantity_available: (currentItem.quantity_available || 0) + data.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.item_id);

      if (updateError) {
        // If updating inventory fails, rollback the purchase
        await supabase.from('purchases').delete().eq('id', purchase.id);
        throw updateError;
      }

      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({
        title: "Success",
        description: "Purchase recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record purchase: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeletePurchase = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast({
        title: "Success",
        description: "Purchase deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete purchase: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
