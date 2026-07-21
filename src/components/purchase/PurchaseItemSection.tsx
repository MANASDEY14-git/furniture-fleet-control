import { Package } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Item } from '@/hooks/useItems';
import { useItemVariants } from '@/hooks/useItemVariants';

import NewItemForm from './NewItemForm';
import ExistingItemSelector from './ExistingItemSelector';
import PurchaseQuantitySection from './PurchaseQuantitySection';

interface PurchaseItemSectionProps {
  isNewItem: boolean;
  formData: {
    itemId: string;
    variantId?: string;
    quantity: number;
    totalCost: number;
  };
  newItemData: {
    name: string;
    categoryId: string;
    sellingPrice: number;
  };
  filteredItems: Item[];
  onFormDataChange: (updates: Partial<PurchaseItemSectionProps['formData']>) => void;
  onNewItemDataChange: (updates: Partial<PurchaseItemSectionProps['newItemData']>) => void;
}

export default function PurchaseItemSection({ 
  isNewItem, 
  formData, 
  newItemData, 
  filteredItems,
  onFormDataChange,
  onNewItemDataChange
}: PurchaseItemSectionProps) {
  const { data: variants = [] } = useItemVariants(formData.itemId);
  const hasVariants = variants.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground flex items-center">
          <Package className="w-5 h-5 mr-2" />
          {isNewItem ? 'New Item Details' : 'Select Existing Item'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isNewItem ? (
          <NewItemForm 
            newItemData={newItemData}
            onNewItemDataChange={onNewItemDataChange}
          />
        ) : (
          <>
            <ExistingItemSelector
              itemId={formData.itemId}
              filteredItems={filteredItems}
              onItemIdChange={(itemId) => {
                onFormDataChange({ itemId });
                if (itemId !== formData.itemId) {
                  onFormDataChange({ variantId: '' });
                }
              }}
            />

            {hasVariants && formData.itemId && (
              <div className="space-y-2">
                <Label>Variant (Optional)</Label>
                <Select
                  value={formData.variantId || 'none'}
                  onValueChange={(value) => onFormDataChange({ variantId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select variant or leave empty for parent item" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Parent Item (No variant)
                    </SelectItem>
                    {variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.variant_name} {variant.sku && `(${variant.sku})`} - Stock: {variant.quantity_available}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        <PurchaseQuantitySection
          quantity={formData.quantity}
          totalCost={formData.totalCost}
          onQuantityChange={(quantity) => onFormDataChange({ quantity })}
          onTotalCostChange={(totalCost) => onFormDataChange({ totalCost })}
        />
      </CardContent>
    </Card>
  );
}
