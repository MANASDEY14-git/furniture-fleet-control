import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaterialPurchase {
  id: string;
  material_id: string;
  supplier_id?: string;
  store_id?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  invoice_number?: string;
  date: string;
  created_at: string;
  materials: {
    id: string;
    name: string;
    unit?: string;
  };
}

export interface CreateMaterialPurchaseData {
  material_id: string;
  supplier_id?: string;
  store_id?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  invoice_number?: string;
  date: string;
}

export const useMaterialPurchases = () => {
  return useQuery({
    queryKey: ['material-purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_purchases')
        .select(`
          *,
          materials (
            id,
            name,
            unit
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MaterialPurchase[];
    },
  });
};

export const useCreateMaterialPurchase = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMaterialPurchaseData) => {
      const { data: purchase, error } = await supabase
        .from('material_purchases')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-stock-movements'] });
      toast({
        title: "Success",
        description: "Material purchase recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record material purchase: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};