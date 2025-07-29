
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ItemVariant {
  id: string;
  item_id: string;
  sku?: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  created_at: string;
  updated_at: string;
  item_variant_attributes: {
    id: string;
    attribute_value_id: string;
    attribute_values: {
      id: string;
      value: string;
      attribute_id: string;
      attributes: {
        id: string;
        name: string;
      };
    };
  }[];
}

export interface CreateVariantData {
  item_id: string;
  sku?: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  attribute_value_ids: string[];
}

export const useItemVariants = (itemId?: string) => {
  return useQuery({
    queryKey: ['item-variants', itemId],
    queryFn: async () => {
      console.log('Fetching variants using custom function for itemId:', itemId);
      
      try {
        // Use the custom function to bypass PostgREST cache issues
        const { data, error } = await supabase.rpc('get_item_variants_with_attributes', {
          p_item_id: itemId || null
        });

        if (error) {
          console.error('Custom function error:', error);
          throw error;
        }

        console.log('Custom function returned:', data);
        
        // Transform the response to match expected format
        const variants = Array.isArray(data) ? data : (data ? [data] : []);
        
        return variants.map((variant: any) => ({
          ...variant,
          item_variant_attributes: variant.attributes?.map((attr: any) => ({
            id: `${variant.id}_${attr.attribute_value_id}`,
            attribute_value_id: attr.attribute_value_id,
            attribute_values: {
              id: attr.attribute_value_id,
              value: attr.value,
              attribute_id: attr.attribute_id,
              attributes: {
                id: attr.attribute_id,
                name: attr.name || ''
              }
            }
          })) || []
        }));
      } catch (error) {
        console.error('Error in custom variant fetch:', error);
        throw error;
      }
    },
    enabled: !!itemId,
  });
};

export const useCreateItemVariant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateVariantData) => {
      console.log('Creating variant with custom function:', data);
      const { attribute_value_ids, ...variantData } = data;
      
      try {
        // Use custom function to bypass PostgREST cache issues
        const { data: variant, error } = await supabase.rpc('create_item_variant_direct', {
          p_item_id: variantData.item_id,
          p_sku: variantData.sku || null,
          p_quantity_available: variantData.quantity_available,
          p_cost_price: variantData.cost_price,
          p_selling_price: variantData.selling_price,
          p_attribute_value_ids: attribute_value_ids || []
        });

        if (error) {
          console.error('Custom function error:', error);
          throw error;
        }

        console.log('Variant created successfully:', variant);
        return variant;
      } catch (error: any) {
        console.error('Error creating variant:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['item-variants', variables.item_id] });
      toast({
        title: "Success",
        description: "Item variant created successfully",
      });
    },
    onError: (error) => {
      console.error('Error saving variant:', error);
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
    mutationFn: async ({ id, item_id, ...data }: Partial<CreateVariantData> & { id: string; item_id: string }) => {
      console.log('Updating variant with custom function:', { id, ...data });
      const { attribute_value_ids, ...variantData } = data;
      
      try {
        // Use custom function to bypass PostgREST cache issues
        const { data: variant, error } = await supabase.rpc('update_item_variant_direct', {
          p_variant_id: id,
          p_sku: variantData.sku || null,
          p_quantity_available: variantData.quantity_available || null,
          p_cost_price: variantData.cost_price || null,
          p_selling_price: variantData.selling_price || null,
          p_attribute_value_ids: attribute_value_ids || null
        });

        if (error) {
          console.error('Custom update function error:', error);
          throw error;
        }

        console.log('Variant updated successfully:', variant);
        return variant;
      } catch (error: any) {
        console.error('Error updating variant:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['item-variants', variables.item_id] });
      toast({
        title: "Success",
        description: "Item variant updated successfully",
      });
    },
    onError: (error) => {
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
    mutationFn: async ({ id, item_id }: { id: string; item_id: string }) => {
      console.log('Deleting variant with custom function:', id);
      
      try {
        // Use custom function to bypass PostgREST cache issues
        const { data: success, error } = await supabase.rpc('delete_item_variant_direct', {
          p_variant_id: id
        });

        if (error) {
          console.error('Custom delete function error:', error);
          throw error;
        }

        console.log('Variant deleted successfully:', success);
        return success;
      } catch (error: any) {
        console.error('Error deleting variant:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['item-variants', variables.item_id] });
      toast({
        title: "Success",
        description: "Item variant deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete variant: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
