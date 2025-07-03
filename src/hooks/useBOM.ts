import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BOMComponent {
  id: string;
  bom_id: string;
  material_id: string;
  quantity_required: number;
  materials: {
    id: string;
    name: string;
    unit?: string;
    quantity_available: number;
  };
}

export interface BOM {
  id: string;
  item_id: string;
  name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bom_components: BOMComponent[];
}

export interface CreateBOMData {
  item_id: string;
  name?: string;
  components: {
    material_id: string;
    quantity_required: number;
  }[];
}

export const useBOMByItem = (itemId: string) => {
  return useQuery({
    queryKey: ['bom', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bom')
        .select(`
          *,
          bom_components (
            *,
            materials (
              id,
              name,
              unit,
              quantity_available
            )
          )
        `)
        .eq('item_id', itemId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as BOM | null;
    },
    enabled: !!itemId,
  });
};

export const useCreateBOM = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBOMData) => {
      // Create BOM first
      const { data: bom, error: bomError } = await supabase
        .from('bom')
        .insert([{
          item_id: data.item_id,
          name: data.name,
          is_active: true
        }])
        .select()
        .single();

      if (bomError) throw bomError;

      // Create BOM components
      const components = data.components.map(comp => ({
        bom_id: bom.id,
        material_id: comp.material_id,
        quantity_required: comp.quantity_required
      }));

      const { error: componentsError } = await supabase
        .from('bom_components')
        .insert(components);

      if (componentsError) throw componentsError;

      return bom;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bom', variables.item_id] });
      toast({
        title: "Success",
        description: "BOM created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create BOM: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateBOM = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ bomId, itemId, components }: { 
      bomId: string; 
      itemId: string; 
      components: { material_id: string; quantity_required: number }[] 
    }) => {
      // Delete existing components
      await supabase
        .from('bom_components')
        .delete()
        .eq('bom_id', bomId);

      // Insert new components
      const newComponents = components.map(comp => ({
        bom_id: bomId,
        material_id: comp.material_id,
        quantity_required: comp.quantity_required
      }));

      const { error } = await supabase
        .from('bom_components')
        .insert(newComponents);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bom', variables.itemId] });
      toast({
        title: "Success",
        description: "BOM updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update BOM: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};