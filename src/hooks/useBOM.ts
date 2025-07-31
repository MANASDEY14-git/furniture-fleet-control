import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BOMComponentOption {
  id: string;
  bom_component_id: string;
  material_id: string;
  option_name: string;
  materials: {
    id: string;
    name: string;
    unit?: string;
    quantity_available: number;
    cost_price: number;
  };
}

export interface BOMComponent {
  id: string;
  bom_id: string;
  material_id: string;
  quantity_required: number;
  component_name?: string;
  is_customizable: boolean;
  notes?: string;
  materials: {
    id: string;
    name: string;
    unit?: string;
    quantity_available: number;
  };
  bom_component_options: BOMComponentOption[];
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

export interface CreateBOMComponentData {
  material_id: string;
  quantity_required: number;
  component_name?: string;
  is_customizable: boolean;
  notes?: string;
  options?: {
    material_id: string;
    option_name: string;
  }[];
}

export interface CreateBOMData {
  item_id: string;
  name?: string;
  components: CreateBOMComponentData[];
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
            ),
            bom_component_options (
              *,
              materials (
                id,
                name,
                unit,
                quantity_available,
                cost_price
              )
            )
          )
        `)
        .eq('item_id', itemId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as any;
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
        quantity_required: comp.quantity_required,
        component_name: comp.component_name,
        is_customizable: comp.is_customizable,
        notes: comp.notes
      }));

      const { data: createdComponents, error: componentsError } = await supabase
        .from('bom_components')
        .insert(components)
        .select();

      if (componentsError) throw componentsError;

      // Create component options for customizable components
      for (let i = 0; i < data.components.length; i++) {
        const comp = data.components[i];
        if (comp.is_customizable && comp.options && comp.options.length > 0) {
          const options = comp.options.map(opt => ({
            bom_component_id: createdComponents[i].id,
            material_id: opt.material_id,
            option_name: opt.option_name
          }));

          const { error: optionsError } = await supabase
            .from('bom_component_options')
            .insert(options);

          if (optionsError) throw optionsError;
        }
      }

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
      components: CreateBOMComponentData[] 
    }) => {
      // Delete existing component options first
      const { data: existingComponents } = await supabase
        .from('bom_components')
        .select('id')
        .eq('bom_id', bomId);

      if (existingComponents && existingComponents.length > 0) {
        const componentIds = existingComponents.map(c => c.id);
        await supabase
          .from('bom_component_options')
          .delete()
          .in('bom_component_id', componentIds);
      }

      // Delete existing components
      await supabase
        .from('bom_components')
        .delete()
        .eq('bom_id', bomId);

      // Insert new components
      const newComponents = components.map(comp => ({
        bom_id: bomId,
        material_id: comp.material_id,
        quantity_required: comp.quantity_required,
        component_name: comp.component_name,
        is_customizable: comp.is_customizable,
        notes: comp.notes
      }));

      const { data: createdComponents, error: componentsError } = await supabase
        .from('bom_components')
        .insert(newComponents)
        .select();

      if (componentsError) throw componentsError;

      // Create component options for customizable components
      for (let i = 0; i < components.length; i++) {
        const comp = components[i];
        if (comp.is_customizable && comp.options && comp.options.length > 0) {
          const options = comp.options.map(opt => ({
            bom_component_id: createdComponents[i].id,
            material_id: opt.material_id,
            option_name: opt.option_name
          }));

          const { error: optionsError } = await supabase
            .from('bom_component_options')
            .insert(options);

          if (optionsError) throw optionsError;
        }
      }
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