import type { ItemVariant } from '@/hooks/useItemVariants';

/**
 * Returns a string like "Red / Large" from the variant's attribute values.
 */
export function getVariantDisplayName(variant: ItemVariant): string {
  if (!variant || !variant.item_variant_attributes) return '';
  const attributeValues = variant.item_variant_attributes.map(attr => attr.attribute_values?.value).filter(Boolean);
  return attributeValues.length > 0 ? attributeValues.join(' / ') : '';
}
