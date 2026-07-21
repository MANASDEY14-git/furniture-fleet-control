
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditTrail {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data?: any;
  new_data?: any;
  user_id?: string;
  created_at: string;
}

export const useAuditTrails = (limit = 100) => {
  return useQuery({
    queryKey: ['audit-trails', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_trails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as AuditTrail[];
    },
  });
};

export const useAuditTrailsByTable = (tableName: string) => {
  return useQuery({
    queryKey: ['audit-trails', tableName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_trails')
        .select('*')
        .eq('table_name', tableName)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AuditTrail[];
    },
  });
};
