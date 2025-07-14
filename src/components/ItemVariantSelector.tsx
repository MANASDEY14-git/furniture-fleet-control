import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useItemVariants } from '@/hooks/useItemVariants';

interface ItemVariantSelectorProps {
  itemId: string;
  value?: string;
  onValueChange: (variantId: string, variantData: any) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ItemVariantSelector({ 
  itemId, 
  value, 
  onValueChange, 
  placeholder = "Select variant",
  disabled = false 
}: ItemVariantSelectorProps) {
  const { data: variants = [] } = useItemVariants(itemId);

  const getVariantDisplayName = (variant: any) => {
    const attributeValues = variant.item_variant_attributes.map((attr: any) => 
      attr.attribute_values.value
    );
    return attributeValues.length > 0 ? attributeValues.join(' / ') : 'Default';
  };

  const handleVariantChange = (variantId: string) => {
    const selectedVariant = variants.find(v => v.id === variantId);
    onValueChange(variantId, selectedVariant);
  };

  if (variants.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
          <SelectValue placeholder="No variants available" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value || ""} onValueChange={handleVariantChange} disabled={disabled}>
      <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-blue-500/30 max-h-60 overflow-y-auto">
        {variants.map((variant) => (
          <SelectItem 
            key={variant.id} 
            value={variant.id} 
            className="text-blue-100 focus:bg-blue-800/30"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span>{getVariantDisplayName(variant)}</span>
                <Badge variant="secondary" className="bg-blue-800/30 text-blue-200 text-xs">
                  Stock: {variant.quantity_available}
                </Badge>
              </div>
              <div className="text-xs text-blue-300">
                Price: ₹{variant.selling_price} | SKU: {variant.sku || 'N/A'}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}