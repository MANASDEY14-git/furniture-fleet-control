import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaterialConsumption {
  id: string;
  material_id: string;
  store_id: string;
  quantity_used: number;
  reference_type: 'order' | 'job' | 'manual' | 'production';
  reference_id?: string;
  date: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  materials?: {
    id: string;
    name: string;
    unit?: string;
  };
  stores?: {
    id: string;
    name: string;
  };
}

export interface CreateMaterialConsumptionData {
  material_id: string;
  store_id: string;
  quantity_used: number;
  reference_type: 'order' | 'job' | 'manual' | 'production';
  reference_id?: string;
  date: string;
  notes?: string;
}

export const useMaterialConsumptions = (materialId?: string) => {
  return useQuery({
    queryKey: ['material-consumptions', materialId],
    queryFn: async () => {
      let query = supabase
        .from('material_consumptions')
        .select(`
          *,
          materials (
            id,
            name,
            unit
          ),
          stores (
            id,
            name
          )
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (materialId) {
        query = query.eq('material_id', materialId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as MaterialConsumption[];
    },
  });
};

export const useCreateMaterialConsumption = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMaterialConsumptionData) => {
      const { data: consumption, error } = await supabase
        .from('material_consumptions')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return consumption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-consumptions'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-stock-movements'] });
      toast({
        title: "Success",
        description: "Material consumption recorded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record material consumption",
        variant: "destructive",
      });
    },
  });
};
