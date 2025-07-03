import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Material {
  id: string;
  name: string;
  unit?: string;
  quantity_available: number;
  cost_price: number;
  store_id?: string;
  supplier_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMaterialData {
  name: string;
  unit?: string;
  quantity_available: number;
  cost_price: number;
  store_id?: string;
  supplier_id?: string;
}

export const useMaterials = () => {
  return useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Material[];
    },
  });
};

export const useCreateMaterial = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMaterialData) => {
      const { data: material, error } = await supabase
        .from('materials')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return material;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({
        title: "Success",
        description: "Material created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create material: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateMaterial = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateMaterialData>) => {
      const { data: material, error } = await supabase
        .from('materials')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return material;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({
        title: "Success",
        description: "Material updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update material: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};