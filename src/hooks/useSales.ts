
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Sale {
  id: string;
  store_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_price: number;
  delivery_status: 'Pending' | 'Delivered';
  date: string;
  created_at: string;
}

export interface CreateSaleData {
  store_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  total_price: number;
  delivery_status: 'Pending' | 'Delivered';
  date: string;
}

export const useSales = () => {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Sale[];
    },
  });
};

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSaleData) => {
      // Start a transaction to update inventory and create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([data])
        .select()
        .single();

      if (saleError) throw saleError;

      // Update item quantity
      const { error: updateError } = await supabase.rpc('decrease_item_quantity', {
        item_id: data.item_id,
        quantity_to_decrease: data.quantity
      });

      if (updateError) {
        // If updating inventory fails, we should rollback the sale
        await supabase.from('sales').delete().eq('id', sale.id);
        throw updateError;
      }

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({
        title: "Success",
        description: "Sale recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record sale: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: "Success",
        description: "Sale deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete sale: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
