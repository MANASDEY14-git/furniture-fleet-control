import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches item variant details for a list of variant IDs.
 * Returns a map of variantId -> ItemVariant.
 */
export function useItemVariantsForOrderItems(variantIds: string[] | undefined) {
  return useQuery({
    queryKey: ['order-item-variants', variantIds],
    queryFn: async () => {
      if (!variantIds || variantIds.length === 0) return {};
      const { data, error } = await supabase
        .from('item_variants')
        .select(`
          *,
          item_variant_attributes (
            id,
            attribute_value_id,
            attribute_values (
              id,
              value,
              attribute_id,
              attributes (
                id,
                name
              )
            )
          )
        `)
        .in('id', variantIds);
      if (error) throw error;
      // Map by variantId for quick lookup
      const map: Record<string, any> = {};
      for (const variant of data) {
        map[variant.id] = variant;
      }
      return map;
    },
    enabled: !!variantIds && variantIds.length > 0,
  });
}
