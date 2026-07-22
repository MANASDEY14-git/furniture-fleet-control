
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Item {
  id: string;
  name: string;
  category_id: string;
  store_id: string;
  supplier_id?: string;
  brand?: string;
  warehouse?: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  stock_receive_date?: string;
  last_restocked_date?: string;
  created_at: string;
  updated_at: string;
  total_quantity?: number;
  has_variants?: boolean;
  image_url?: string;
}

export interface CreateItemData {
  name: string;
  category_id: string;
  store_id: string;
  supplier_id?: string;
  brand?: string;
  warehouse?: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  stock_receive_date?: string;
  last_restocked_date?: string;
  image_url?: string;
}

export interface UpdateItemData extends Partial<CreateItemData> {
  id: string;
}

export const useItems = (storeId?: string) => {
  return useQuery({
    queryKey: ['items', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('search_items_enhanced', { 
          search_term: '',
          store_id_filter: storeId && storeId !== 'all' ? storeId : null,
          page_size: 1000 // Increased from default 50 to handle 500+ items
        });
      
      if (error) throw error;
      return data as Item[];
    },
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateItemData) => {
      const { data: item, error } = await supabase
        .from('items')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({
        title: "Success",
        description: "Item created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create item: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateItemData) => {
      const { data: item, error } = await supabase
        .from('items')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update item: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete item: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
