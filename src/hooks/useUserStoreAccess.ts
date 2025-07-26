import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserStoreAccess {
  id: string;
  user_id: string;
  store_id: string;
  created_at: string;
}

export interface CreateUserStoreAccessData {
  user_id: string;
  store_id: string;
}

export const useUserStoreAccess = (userId?: string) => {
  return useQuery({
    queryKey: ['user-store-access', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_store_access')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as UserStoreAccess[];
    },
    enabled: !!userId,
  });
};

export const useCreateUserStoreAccess = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateUserStoreAccessData) => {
      const { data: access, error } = await supabase
        .from('user_store_access')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return access;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-store-access'] });
      toast({
        title: "Success",
        description: "User store access granted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to grant store access: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteUserStoreAccess = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_store_access')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-store-access'] });
      toast({
        title: "Success",
        description: "Store access revoked successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to revoke store access: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};