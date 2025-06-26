
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Purchase, CreatePurchaseData } from '@/types';

export const usePurchases = () => {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: async (): Promise<Purchase[]> => {
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
    mutationFn: async (data: CreatePurchaseData & { createNewItem?: boolean; itemData?: any }) => {
      // If creating a new item, add it to inventory first
      if (data.createNewItem && data.itemData) {
        const { data: newItem, error: itemError } = await supabase
          .from('items')
          .insert([{
            name: data.itemData.name,
            category_id: data.itemData.category_id,
            store_id: data.store_id,
            supplier_id: data.supplier_id,
            quantity_available: data.quantity,
            cost_price: data.total_cost / data.quantity,
            selling_price: data.itemData.selling_price,
            stock_received_date: data.date
          }])
          .select()
          .single();

        if (itemError) throw itemError;
        
        // Update purchase data with new item ID
        data.item_id = newItem.id;
        data.item_name = newItem.name;
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert([{
          store_id: data.store_id,
          item_id: data.item_id,
          item_name: data.item_name,
          supplier_id: data.supplier_id,
          invoice_number: data.invoice_number,
          quantity: data.quantity,
          total_cost: data.total_cost,
          date: data.date
        }])
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // If not creating new item, update existing item quantity
      if (!data.createNewItem) {
        const { data: currentItem, error: fetchError } = await supabase
          .from('items')
          .select('quantity_available')
          .eq('id', data.item_id)
          .single();

        if (fetchError) {
          await supabase.from('purchases').delete().eq('id', purchase.id);
          throw fetchError;
        }

        const { error: updateError } = await supabase
          .from('items')
          .update({ 
            quantity_available: (currentItem.quantity_available || 0) + data.quantity,
            updated_at: new Date().toISOString(),
            last_restocked_date: data.date
          })
          .eq('id', data.item_id);

        if (updateError) {
          await supabase.from('purchases').delete().eq('id', purchase.id);
          throw updateError;
        }
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
