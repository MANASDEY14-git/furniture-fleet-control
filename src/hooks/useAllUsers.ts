import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserWithAccess {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  store_count: number;
  created_at: string;
}

export interface UserStoreAccessWithStore {
  id: string;
  store_id: string;
  store_name: string;
  store_location: string;
}

export const useAllUsers = () => {
  return useQuery({
    queryKey: ['all-users-admin'],
    queryFn: async (): Promise<UserWithAccess[]> => {
      const { data, error } = await supabase.rpc('get_all_users_for_admin');
      
      if (error) throw error;
      return data as UserWithAccess[];
    },
  });
};

export const useUserStoreAccessDetails = (userId?: string) => {
  return useQuery({
    queryKey: ['user-store-access-details', userId],
    queryFn: async (): Promise<UserStoreAccessWithStore[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_store_access')
        .select(`
          id,
          store_id,
          stores!user_store_access_store_id_fkey (
            name,
            location
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        store_id: item.store_id,
        store_name: item.stores?.name || 'Unknown',
        store_location: item.stores?.location || 'Unknown',
      }));
    },
    enabled: !!userId,
  });
};

export const useGrantStoreAccess = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, storeId }: { userId: string; storeId: string }) => {
      const { error } = await supabase
        .from('user_store_access')
        .insert({ user_id: userId, store_id: storeId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-admin'] });
      queryClient.invalidateQueries({ queryKey: ['user-store-access-details'] });
      toast({
        title: 'Access Granted',
        description: 'User has been granted access to the store.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to grant store access.',
        variant: 'destructive',
      });
    },
  });
};

export const useRevokeStoreAccess = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (accessId: string) => {
      const { error } = await supabase
        .from('user_store_access')
        .delete()
        .eq('id', accessId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-admin'] });
      queryClient.invalidateQueries({ queryKey: ['user-store-access-details'] });
      toast({
        title: 'Access Revoked',
        description: 'Store access has been removed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke store access.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      // First check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole as any })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users-admin'] });
      toast({
        title: 'Role Updated',
        description: 'User role has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role.',
        variant: 'destructive',
      });
    },
  });
};
