
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useItemVariants } from '@/hooks/useItemVariants';
import ExistingItemSelector from './ExistingItemSelector';

import { Item } from '@/types';

interface PurchaseItem {
  id: string;
  itemId: string;
  itemName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isNewItem: boolean;
  newItemName: string;
  newItemSellingPrice: number;
  newItemCostPrice: number;
  newItemCategoryId: string;
}

interface PurchaseItemRowProps {
  item: PurchaseItem;
  availableItems: Item[];
  categories: any[];
  onUpdateItem: (id: string, field: keyof PurchaseItem, value: any) => void;
  onRemoveItem: (id: string) => void;
  canRemove: boolean;
  currentSupplierId?: string;
}

export default function PurchaseItemRow({
  item,
  availableItems,
  categories,
  onUpdateItem,
  onRemoveItem,
  canRemove,
  currentSupplierId
}: PurchaseItemRowProps) {
  const selectedItem = availableItems.find(i => i.id === item.itemId);
  const { data: variants = [] } = useItemVariants(item.itemId);
  const hasVariants = variants.length > 0;
  const isDifferentSupplier = selectedItem && currentSupplierId && selectedItem.supplier_id !== currentSupplierId;

  return (
    <TableRow>
      <TableCell>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={item.isNewItem}
              onChange={(e) => {
                const checked = e.target.checked;
                onUpdateItem(item.id, 'isNewItem', checked);
                if (checked) {
                  onUpdateItem(item.id, 'itemId', '');
                  onUpdateItem(item.id, 'variantId', '');
                }
              }}
              className="rounded border-border"
            />
            <span className="text-sm text-muted-foreground">New Item</span>
          </div>
          
          {item.isNewItem ? (
            <div className="space-y-2">
              <Input
                value={item.newItemName}
                onChange={(e) => onUpdateItem(item.id, 'newItemName', e.target.value)}
                placeholder="Enter new item name"
              />
              <Select
                value={item.newItemCategoryId}
                onValueChange={(value) => onUpdateItem(item.id, 'newItemCategoryId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <ExistingItemSelector
                itemId={item.itemId}
                filteredItems={availableItems}
                onItemIdChange={(value) => onUpdateItem(item.id, 'itemId', value)}
              />
              {isDifferentSupplier && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                  Different supplier
                </Badge>
              )}

              {hasVariants && item.itemId && (
                <Select
                  value={item.variantId || 'none'}
                  onValueChange={(value) => {
                    const actualValue = value === 'none' ? undefined : value;
                    onUpdateItem(item.id, 'variantId', actualValue);
                    const variant = variants.find(v => v.id === value);
                    onUpdateItem(item.id, 'variantName', variant?.variant_name || '');
                    if (variant) {
                      onUpdateItem(item.id, 'unitPrice', variant.cost_price || 0);
                    } else if (selectedItem) {
                      onUpdateItem(item.id, 'unitPrice', selectedItem.cost_price || 0);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select variant (optional)" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="none">
                      Parent Item (No variant)
                    </SelectItem>
                    {variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.variant_name} {variant.sku && `(${variant.sku})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      </TableCell>
      
      
      <TableCell>
        <Input
          type="number"
          value={item.quantity || ''}
          onChange={(e) => onUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
          className="w-24"
          min="1"
        />
      </TableCell>
      
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={item.unitPrice || ''}
          onChange={(e) => onUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
          className="w-28"
          min="0"
        />
      </TableCell>
      
      {item.isNewItem && (
        <>
          <TableCell>
            <Input
              type="number"
              step="0.01"
              value={item.newItemSellingPrice || ''}
              onChange={(e) => onUpdateItem(item.id, 'newItemSellingPrice', parseFloat(e.target.value) || 0)}
              className="w-28"
              min="0"
            />
          </TableCell>
          
          <TableCell>
            <Input
              type="number"
              step="0.01"
              value={item.newItemCostPrice || ''}
              onChange={(e) => onUpdateItem(item.id, 'newItemCostPrice', parseFloat(e.target.value) || 0)}
              className="w-28"
              min="0"
            />
          </TableCell>
        </>
      )}
      
      <TableCell className="text-foreground font-semibold">
        ₹{item.totalPrice.toFixed(2)}
      </TableCell>
      
      <TableCell>
        <Button
          type="button"
          onClick={() => onRemoveItem(item.id)}
          disabled={!canRemove}
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
