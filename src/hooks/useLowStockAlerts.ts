
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
  });
};

export const useCreateLowStockAlert = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<LowStockAlert, 'id' | 'created_at' | 'resolved_at'>) => {
      const { data: alert, error } = await supabase
        .from('low_stock_alerts')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return alert;
    },
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast({
        title: "Alert Resolved",
        description: "Low stock alert has been resolved",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to resolve alert: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
