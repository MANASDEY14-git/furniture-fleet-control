import { useState } from 'react';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useItemVariants } from '@/hooks/useItemVariants';
import { formatCurrency } from '@/utils/currencyUtils';

interface ItemVariantsDisplayProps {
  itemId: string;
  itemName: string;
}

export default function ItemVariantsDisplay({ itemId, itemName }: ItemVariantsDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: variants = [], isLoading } = useItemVariants(itemId);

  const getVariantDisplayName = (variant: any) => {
    const attributeValues = variant.item_variant_attributes?.map((attr: any) => 
      attr.attribute_values?.value
    ).filter(Boolean);
    return attributeValues?.length > 0 ? attributeValues.join(' / ') : 'Default';
  };

  const hasVariants = variants.length > 0;

  if (!hasVariants) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="h-auto p-0 text-blue-300 hover:text-blue-200"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 mr-1" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-1" />
        )}
        <Package className="h-4 w-4 mr-1" />
        <span className="text-sm">{variants.length} variants</span>
      </Button>

      {isExpanded && (
        <div className="ml-4 border-l-2 border-blue-500/30 pl-4">
          {isLoading ? (
            <div className="text-sm text-blue-300">Loading variants...</div>
          ) : (
            <div className="space-y-1">
              {variants.map((variant) => (
                <div key={variant.id} className="flex items-center justify-between p-2 rounded bg-slate-800/30 border border-blue-500/20">
                  <div className="flex-1">
                    <div className="text-sm text-blue-200 font-medium">
                      {getVariantDisplayName(variant)}
                    </div>
                    <div className="text-xs text-blue-300">
                      SKU: {variant.sku || 'N/A'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        variant.quantity_available === 0 
                          ? 'bg-red-500/20 text-red-300' 
                          : variant.quantity_available < 10 
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'bg-green-500/20 text-green-300'
                      }`}
                    >
                      Stock: {variant.quantity_available}
                    </Badge>
                    <div className="text-xs text-cyan-300 font-medium">
                      {formatCurrency(variant.selling_price)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}