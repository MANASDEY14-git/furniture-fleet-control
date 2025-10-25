import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ItemVariant {
  id: string;
  parent_item_id: string;
  variant_name: string;
  sku?: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  attributes?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateItemVariantData {
  parent_item_id: string;
  variant_name: string;
  sku?: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  attributes?: Record<string, any>;
}

export interface UpdateItemVariantData extends Partial<CreateItemVariantData> {
  id: string;
}

export const useItemVariants = (parentItemId?: string) => {
  return useQuery({
    queryKey: ['item-variants', parentItemId],
    queryFn: async () => {
      if (!parentItemId) return [];
      
      const { data, error } = await supabase
        .from('item_variants' as any)
        .select('*')
        .eq('parent_item_id', parentItemId)
        .eq('is_active', true)
        .order('variant_name', { ascending: true });
      
      if (error) throw error;
      return data as unknown as ItemVariant[];
    },
    enabled: !!parentItemId,
  });
};

export const useCreateItemVariant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateItemVariantData) => {
      const { data: variant, error } = await supabase
        .from('item_variants' as any)
        .insert([data] as any)
        .select()
        .single();

      if (error) throw error;
      return variant as unknown as ItemVariant;
    },
    onSuccess: (variant, variables) => {
      queryClient.invalidateQueries({ queryKey: ['item-variants', variables.parent_item_id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({
        title: "Success",
        description: "Variant created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create variant: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateItemVariant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateItemVariantData) => {
      const { data: variant, error } = await supabase
        .from('item_variants' as any)
        .update({
          ...data,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return variant as unknown as ItemVariant;
    },
    onSuccess: (variant) => {
      queryClient.invalidateQueries({ queryKey: ['item-variants', variant.parent_item_id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({
        title: "Success",
        description: "Variant updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update variant: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteItemVariant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { data, error } = await supabase
        .from('item_variants' as any)
        .update({ is_active: false } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ItemVariant;
    },
    onSuccess: (variant) => {
      queryClient.invalidateQueries({ queryKey: ['item-variants', variant.parent_item_id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({
        title: "Success",
        description: "Variant deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete variant: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};