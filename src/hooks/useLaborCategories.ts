import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LaborCategory {
  id: string;
  name: string;
  description?: string;
  default_hourly_rate: number;
  created_at: string;
  updated_at: string;
}

interface CreateLaborCategoryData {
  name: string;
  description?: string;
  default_hourly_rate: number;
}

export const useLaborCategories = () => {
  return useQuery({
    queryKey: ['labor-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labor_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as LaborCategory[];
    },
  });
};

export const useCreateLaborCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLaborCategoryData) => {
      const { data: result, error } = await supabase
        .from('labor_categories')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-categories'] });
      toast.success('Labor category created successfully');
    },
    onError: (error) => {
      console.error('Error creating labor category:', error);
      toast.error('Failed to create labor category');
    },
  });
};

export const useUpdateLaborCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<LaborCategory> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('labor_categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-categories'] });
      toast.success('Labor category updated successfully');
    },
    onError: (error) => {
      console.error('Error updating labor category:', error);
      toast.error('Failed to update labor category');
    },
  });
};