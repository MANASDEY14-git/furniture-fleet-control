import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SalesCustomization {
  id: string;
  sale_id: string;
  bom_component_id: string;
  selected_material_id: string;
  selected_option_name: string;
  quantity_used: number;
  created_at: string;
}

export interface CreateSalesCustomizationData {
  sale_id: string;
  bom_component_id: string;
  selected_material_id: string;
  selected_option_name: string;
  quantity_used: number;
}

export const useCreateSalesCustomizations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customizations: CreateSalesCustomizationData[]) => {
      const { data, error } = await supabase
        .from('sales_customizations')
        .insert(customizations)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-customizations'] });
      toast({
        title: "Success",
        description: "Product customizations saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save customizations: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useSalesCustomizationsBySale = (saleId: string) => {
  return useQuery({
    queryKey: ['sales-customizations', saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_customizations')
        .select('*')
        .eq('sale_id', saleId);
      
      if (error) throw error;
      return data as SalesCustomization[];
    },
    enabled: !!saleId,
  });
};