
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Store {
  id: string;
  name: string;
  location: string;
  created_at?: string;
  updated_at?: string;
}

export const useStores = () => {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Store[];
    }
  });
};

export const useCreateStore = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (store: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('stores')
        .insert([store])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast({
        title: "Success",
        description: "Store created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create store: ${error.message}`,
        variant: "destructive",
      });
    }
  });
};

export const useUpdateStore = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Store> & { id: string }) => {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast({
        title: "Success",
        description: "Store updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update store: ${error.message}`,
        variant: "destructive",
      });
    }
  });
};

export const useDeleteStore = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast({
        title: "Success",
        description: "Store deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete store: ${error.message}`,
        variant: "destructive",
      });
    }
  });
};
