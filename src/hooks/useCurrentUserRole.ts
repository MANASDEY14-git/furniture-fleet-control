import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserRoleData {
  role: string | null;
  isAdmin: boolean;
  isManager: boolean;
  isAccountant: boolean;
  isSalesRep: boolean;
  hasStoreAccess: boolean;
}

export const useCurrentUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-user-role', user?.id],
    queryFn: async (): Promise<UserRoleData> => {
      if (!user?.id) {
        return {
          role: null,
          isAdmin: false,
          isManager: false,
          isAccountant: false,
          isSalesRep: false,
          hasStoreAccess: false,
        };
      }

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const role = roleData?.role || 'employee';

      // Check if user has any store access
      const { data: storeAccessData } = await supabase
        .from('user_store_access')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const hasStoreAccess = role === 'admin' || (storeAccessData && storeAccessData.length > 0);

      return {
        role,
        isAdmin: role === 'admin',
        isManager: role === 'manager',
        isAccountant: role === 'accountant',
        isSalesRep: role === 'sales_representative',
        hasStoreAccess,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
