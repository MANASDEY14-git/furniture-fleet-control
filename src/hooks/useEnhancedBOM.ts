import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BOM, 
  CreateBOMData, 
  UpdateBOMData, 
  BOMCostCalculation, 
  BOMValidationResult,
  BOMSearchFilters,
  BOMListItem,
  CreateBOMSchema,
  UpdateBOMSchema 
} from '@/types/bom';

// Enhanced BOM queries with better error handling and data validation
export const useEnhancedBOMByItem = (itemId: string) => {
  const { session } = useAuth();
  
  return useQuery({
    queryKey: ['enhanced-bom', itemId],
    queryFn: async (): Promise<BOM | null> => {
      if (!session?.user) {
        throw new Error('User not authenticated');
      }
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
              quantity_available,
              cost_price
            ),
            labor_categories (
              id,
              name,
              description,
              default_hourly_rate
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
    enabled: !!itemId && !!session?.user,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};

export const useEnhancedBOMList = (filters: BOMSearchFilters = {}) => {
  const { session } = useAuth();
  
  return useQuery({
    queryKey: ['enhanced-bom-list', filters],
    queryFn: async (): Promise<BOMListItem[]> => {
      if (!session?.user) {
        throw new Error('User not authenticated');
      }
      let query = supabase
        .from('bom')
        .select(`
          id,
          item_id,
          name,
          estimated_cost,
          is_active,
          updated_at,
          version,
          items!inner(name),
          bom_components(id)
        `)
        .eq('is_active', filters.isActive ?? true);

      if (filters.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,items.name.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        item_id: item.item_id,
        item_name: (item as any).items?.name || 'Unknown Item',
        name: item.name,
        estimated_cost: item.estimated_cost || 0,
        component_count: item.bom_components?.length || 0,
        has_stock_issues: false, // Will be calculated client-side
        is_active: item.is_active,
        last_updated: item.updated_at,
        version: item.version || 1,
      })) as BOMListItem[];
    },
    staleTime: 60000, // 1 minute
    enabled: !!session?.user,
  });
};

export const useCreateEnhancedBOM = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateBOMData): Promise<BOM> => {
      if (!session?.user) {
        throw new Error('User not authenticated. Please log in to create BOMs.');
      }
      // Validate data with Zod
      const validatedData = CreateBOMSchema.parse(data);

      // Create BOM first
      const { data: bom, error: bomError } = await supabase
        .from('bom')
        .insert([{
          item_id: validatedData.item_id,
          name: validatedData.name,
          version_notes: validatedData.version_notes,
          is_active: true,
          version: 1,
        }])
        .select()
        .single();

      if (bomError) throw bomError;

      // Create BOM components and options with cleanup on failure
      let createdComponents: any[] = [];
      try {
        const components = validatedData.components
          .filter(comp => comp.is_customizable || comp.material_id || comp.component_type !== 'material')
          .map(comp => ({
            bom_id: bom.id,
            material_id: comp.material_id || null,
            quantity_required: comp.quantity_required,
            component_name: comp.component_name || null,
            is_customizable: comp.is_customizable,
            notes: comp.notes || null,
            component_type: comp.component_type || 'material',
            time_hours: comp.time_hours || null,
            time_minutes: comp.time_minutes || null,
            hourly_rate: comp.hourly_rate || null,
            service_cost: comp.service_cost || null,
            labor_category_id: comp.labor_category_id || null,
          }));

        if (components.length === 0) {
          throw new Error('No valid components to create');
        }

        const { data: insertedComponents, error: componentsError } = await supabase
          .from('bom_components')
          .insert(components)
          .select();

        if (componentsError) throw componentsError;
        createdComponents = insertedComponents || [];

        // Create component options for customizable components
        for (let i = 0; i < validatedData.components.length; i++) {
          const comp = validatedData.components[i];
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
      } catch (err) {
        // Attempt cleanup on partial failure
        try {
          if (createdComponents.length > 0) {
            const ids = createdComponents.map((c: any) => c.id);
            await supabase.from('bom_component_options').delete().in('bom_component_id', ids);
          }
          await supabase.from('bom_components').delete().eq('bom_id', (bom as any).id);
          await supabase.from('bom').delete().eq('id', (bom as any).id);
        } catch (_cleanupErr) {
          // Swallow cleanup errors
        }
        throw err;
      }

      return bom as BOM;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-bom', variables.item_id] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-bom-list'] });
      toast({
        title: "Success",
        description: "BOM created successfully with enhanced validation",
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

export const useUpdateEnhancedBOM = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateBOMData): Promise<void> => {
      if (!session?.user) {
        throw new Error('User not authenticated. Please log in to update BOMs.');
      }
      // Validate data with Zod
      const validatedData = UpdateBOMSchema.parse(data);

      // Update BOM metadata
      const { error: bomUpdateError } = await supabase
        .from('bom')
        .update({
          name: validatedData.name,
          version_notes: validatedData.version_notes,
          version: 1, // Will be handled by database trigger
        })
        .eq('id', validatedData.bomId);

      if (bomUpdateError) throw bomUpdateError;

      // Delete existing component options first
      const { data: existingComponents } = await supabase
        .from('bom_components')
        .select('id')
        .eq('bom_id', validatedData.bomId);

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
        .eq('bom_id', validatedData.bomId);

      // Insert new components
      const newComponents = validatedData.components
        .filter(comp => comp.is_customizable || comp.material_id || comp.component_type !== 'material')
        .map(comp => ({
          bom_id: validatedData.bomId,
          material_id: comp.material_id || null,
          quantity_required: comp.quantity_required,
          component_name: comp.component_name || null,
          is_customizable: comp.is_customizable,
          notes: comp.notes || null,
          component_type: comp.component_type || 'material',
          time_hours: comp.time_hours || null,
          time_minutes: comp.time_minutes || null,
          hourly_rate: comp.hourly_rate || null,
          service_cost: comp.service_cost || null,
          labor_category_id: comp.labor_category_id || null,
        }));

      if (newComponents.length === 0) {
        throw new Error('No valid components to update');
      }

      const { data: createdComponents, error: componentsError } = await supabase
        .from('bom_components')
        .insert(newComponents)
        .select();

      if (componentsError) throw componentsError;

      // Create component options for customizable components
      for (let i = 0; i < validatedData.components.length; i++) {
        const comp = validatedData.components[i];
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
      queryClient.invalidateQueries({ queryKey: ['enhanced-bom', variables.itemId] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-bom-list'] });
      toast({
        title: "Success",
        description: "BOM updated successfully with version tracking",
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

export const useBOMCostCalculation = (bomId: string) => {
  const { session } = useAuth();
  
  return useQuery({
    queryKey: ['bom-cost-calculation', bomId],
    queryFn: async (): Promise<BOMCostCalculation> => {
      if (!session?.user) {
        throw new Error('User not authenticated');
      }
      const { data: bom, error } = await supabase
        .from('bom')
        .select(`
          *,
          bom_components (
            *,
            materials (
              id,
              name,
              unit,
              quantity_available,
              cost_price
            )
          )
        `)
        .eq('id', bomId)
        .single();

      if (error) throw error;

      const componentCosts = bom.bom_components.map((comp: any) => ({
        componentId: comp.id,
        componentName: comp.component_name,
        materialName: comp.materials?.name || 'Unknown Material',
        quantity: comp.quantity_required,
        unitCost: comp.materials?.cost_price || 0,
        totalCost: comp.quantity_required * (comp.materials?.cost_price || 0),
      }));

      const totalEstimatedCost = componentCosts.reduce((sum, comp) => sum + comp.totalCost, 0);

      const unavailableMaterials = bom.bom_components
        .filter((comp: any) => comp.materials && comp.materials.quantity_available < comp.quantity_required)
        .map((comp: any) => ({
          materialId: comp.material_id,
          materialName: comp.materials.name,
          required: comp.quantity_required,
          available: comp.materials.quantity_available,
          shortage: comp.quantity_required - comp.materials.quantity_available,
        }));

      return {
        totalEstimatedCost,
        componentCosts,
        materialsAvailable: unavailableMaterials.length === 0,
        unavailableMaterials,
      };
    },
    enabled: !!bomId && !!session?.user,
    staleTime: 30000,
  });
};

export const useBOMValidation = () => {
  return {
    validateBOM: (bomData: CreateBOMData | UpdateBOMData): BOMValidationResult => {
      const errors: string[] = [];
      const warnings: string[] = [];

      try {
        if ('bomId' in bomData) {
          UpdateBOMSchema.parse(bomData);
        } else {
          CreateBOMSchema.parse(bomData);
        }
      } catch (error: any) {
        if (error.errors) {
          errors.push(...error.errors.map((err: any) => err.message));
        }
      }

      // Custom validation logic
      if (bomData.components.length === 0) {
        errors.push('BOM must have at least one component');
      }

      const customizableComponents = bomData.components.filter(comp => comp.is_customizable);
      customizableComponents.forEach((comp, index) => {
        if (!comp.options || comp.options.length === 0) {
          warnings.push(`Customizable component ${index + 1} has no options defined`);
        }
      });

      const fixedComponents = bomData.components.filter(comp => !comp.is_customizable);
      fixedComponents.forEach((comp, index) => {
        if (!comp.material_id) {
          errors.push(`Fixed component ${index + 1} must have a material selected`);
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }
  };
};

export const useDeleteBOM = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (bomId: string): Promise<void> => {
      if (!session?.user) {
        throw new Error('User not authenticated. Please log in to delete BOMs.');
      }
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('bom')
        .update({ is_active: false })
        .eq('id', bomId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-bom-list'] });
      toast({
        title: "Success",
        description: "BOM deactivated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete BOM: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};