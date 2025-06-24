
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LowStockAlert {
  id: string;
  item_id: string;
  item_name: string;
  current_quantity: number;
  threshold_quantity: number;
  store_id?: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string;
}

export const useLowStockAlerts = () => {
  return useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('low_stock_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LowStockAlert[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateLowStockAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<LowStockAlert, 'id' | 'created_at' | 'resolved_at'>) => {
      // Check if alert already exists for this item
      const { data: existingAlert, error: checkError } = await supabase
        .from('low_stock_alerts')
        .select('id')
        .eq('item_id', data.item_id)
        .eq('is_resolved', false)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError;
      }

      // If alert already exists, don't create a new one
      if (existingAlert) {
        return existingAlert;
      }

      const { data: alert, error } = await supabase
        .from('low_stock_alerts')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return alert;
    },
    onSuccess: (data, variables) => {
      // Optimistic update
      queryClient.setQueryData(['low-stock-alerts'], (old: LowStockAlert[] | undefined) => {
        if (!old) return [data];
        const exists = old.some(alert => alert.item_id === variables.item_id && !alert.is_resolved);
        if (exists) return old; // Don't add if already exists
        return [data, ...old];
      });
      
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast({
        title: "Alert Created",
        description: "Low stock alert has been created",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create alert: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useResolveLowStockAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('low_stock_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id: string) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['low-stock-alerts'] });
      
      const previousAlerts = queryClient.getQueryData(['low-stock-alerts']);
      
      queryClient.setQueryData(['low-stock-alerts'], (old: LowStockAlert[] | undefined) => {
        if (!old) return [];
        return old.filter(alert => alert.id !== id);
      });

      return { previousAlerts };
    },
    onError: (error, id, context) => {
      // Rollback on error
      queryClient.setQueryData(['low-stock-alerts'], context?.previousAlerts);
      toast({
        title: "Error",
        description: `Failed to resolve alert: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast({
        title: "Alert Resolved",
        description: "Low stock alert has been resolved",
      });
    },
  });
};
