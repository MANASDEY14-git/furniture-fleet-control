
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
      let query = supabase
        .from('item_variants')
        .select('*');

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data: variants, error: variantsError } = await query.order('created_at', { ascending: false });
      
      if (variantsError) throw variantsError;

      // Get variant attributes and attribute values separately
      if (variants.length > 0) {
        const variantIds = variants.map(v => v.id);
        
        const [variantAttributesResult, attributeValuesResult, attributesResult] = await Promise.all([
          supabase
            .from('item_variant_attributes')
            .select('*')
            .in('variant_id', variantIds),
          supabase
            .from('attribute_values')
            .select('*'),
          supabase
            .from('attributes')
            .select('*')
        ]);

        if (variantAttributesResult.error) throw variantAttributesResult.error;
        if (attributeValuesResult.error) throw attributeValuesResult.error;
        if (attributesResult.error) throw attributesResult.error;

        // Manually combine the data
        const enrichedVariants: ItemVariant[] = variants.map(variant => ({
          ...variant,
          item_variant_attributes: variantAttributesResult.data
            .filter(va => va.variant_id === variant.id)
            .map(va => {
              const attributeValue = attributeValuesResult.data.find(av => av.id === va.attribute_value_id);
              const attribute = attributesResult.data.find(a => a.id === attributeValue?.attribute_id);
              
              return {
                id: va.id,
                attribute_value_id: va.attribute_value_id,
                attribute_values: {
                  id: attributeValue?.id || '',
                  value: attributeValue?.value || '',
                  attribute_id: attributeValue?.attribute_id || '',
                  attributes: {
                    id: attribute?.id || '',
                    name: attribute?.name || ''
                  }
                }
              };
            })
        }));

        return enrichedVariants;
      }
      
      return variants as ItemVariant[];
    },
    enabled: !!itemId,
  });
};

export const useCreateItemVariant = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateVariantData) => {
      const { attribute_value_ids, ...variantData } = data;
      
      // Create the variant
      const { data: variant, error: variantError } = await supabase
        .from('item_variants')
        .insert([variantData])
        .select()
        .single();

      if (variantError) throw variantError;

      // Create variant attribute associations
      if (attribute_value_ids.length > 0) {
        const variantAttributes = attribute_value_ids.map(attribute_value_id => ({
          variant_id: variant.id,
          attribute_value_id,
        }));

        const { error: attributeError } = await supabase
          .from('item_variant_attributes')
          .insert(variantAttributes);

        if (attributeError) throw attributeError;
      }

      return variant;
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
      const { attribute_value_ids, ...variantData } = data;
      
      // Update the variant
      const { data: variant, error: variantError } = await supabase
        .from('item_variants')
        .update(variantData)
        .eq('id', id)
        .select()
        .single();

      if (variantError) throw variantError;

      // Update variant attribute associations if provided
      if (attribute_value_ids !== undefined) {
        // Delete existing associations
        await supabase
          .from('item_variant_attributes')
          .delete()
          .eq('variant_id', id);

        // Create new associations
        if (attribute_value_ids.length > 0) {
          const variantAttributes = attribute_value_ids.map(attribute_value_id => ({
            variant_id: id,
            attribute_value_id,
          }));

          const { error: attributeError } = await supabase
            .from('item_variant_attributes')
            .insert(variantAttributes);

          if (attributeError) throw attributeError;
        }
      }

      return variant;
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
      const { error } = await supabase
        .from('item_variants')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
