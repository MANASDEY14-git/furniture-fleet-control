import { Package } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item } from '@/hooks/useItems';

import NewItemForm from './NewItemForm';
import ExistingItemSelector from './ExistingItemSelector';
import PurchaseQuantitySection from './PurchaseQuantitySection';

interface PurchaseItemSectionProps {
  isNewItem: boolean;
  formData: {
    itemId: string;
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
  return (
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="text-blue-200 flex items-center">
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
          <ExistingItemSelector
            itemId={formData.itemId}
            filteredItems={filteredItems}
            onItemIdChange={(itemId) => onFormDataChange({ itemId })}
          />
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