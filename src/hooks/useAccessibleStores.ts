import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';

export interface AccessibleStore {
  id: string;
  name: string;
  location: string;
}

/**
 * Returns the stores the current user is allowed to access.
 * - Admins/Managers: all stores in the system.
 * - Everyone else: only stores they have been explicitly granted access to.
 */
export const useAccessibleStores = () => {
  const { user } = useAuth();
  const { data: roleData } = useCurrentUserRole();

  return useQuery({
    queryKey: ['accessible-stores', user?.id, roleData?.role],
    queryFn: async (): Promise<AccessibleStore[]> => {
      if (!user?.id) return [];

      const isPrivileged = roleData?.isAdmin || roleData?.isManager;

      if (isPrivileged) {
        // Admins / managers see every store
        const { data, error } = await supabase
          .from('stores')
          .select('id, name, location')
          .order('name');
        if (error) throw error;
        return (data ?? []) as AccessibleStore[];
      }

      // Non-privileged: join user_store_access → stores
      const { data, error } = await supabase
        .from('user_store_access')
        .select(`
          store_id,
          stores (
            id,
            name,
            location
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Flatten the joined result
      return (data ?? [])
        .map((row: any) => row.stores)
        .filter(Boolean) as AccessibleStore[];
    },
    enabled: !!user?.id && !!roleData,
    staleTime: 5 * 60 * 1000,
  });
};
