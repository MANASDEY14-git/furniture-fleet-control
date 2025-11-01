
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { useItemVariants } from '@/hooks/useItemVariants';

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
}

export default function PurchaseItemRow({
  item,
  availableItems,
  categories,
  onUpdateItem,
  onRemoveItem,
  canRemove
}: PurchaseItemRowProps) {
  const selectedItem = availableItems.find(i => i.id === item.itemId);
  const { data: variants = [] } = useItemVariants(item.itemId);
  const hasVariants = variants.length > 0;

  return (
    <TableRow className="border-blue-500/20">
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
                  // Clear item and variant when switching to new item
                  onUpdateItem(item.id, 'itemId', '');
                  onUpdateItem(item.id, 'variantId', '');
                }
              }}
              className="rounded border-blue-500/30"
            />
            <span className="text-sm text-blue-200">New Item</span>
          </div>
          
          {item.isNewItem ? (
            <div className="space-y-2">
              <Input
                value={item.newItemName}
                onChange={(e) => onUpdateItem(item.id, 'newItemName', e.target.value)}
                placeholder="Enter new item name"
                className="neon-border bg-slate-800/50 text-blue-100"
              />
              <Select
                value={item.newItemCategoryId}
                onValueChange={(value) => onUpdateItem(item.id, 'newItemCategoryId', value)}
              >
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="text-blue-100 focus:bg-blue-800/30">
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Select
                value={item.itemId}
                onValueChange={(value) => {
                  onUpdateItem(item.id, 'itemId', value);
                  // Clear variant when item changes
                  onUpdateItem(item.id, 'variantId', '');
                }}
              >
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100 min-w-[200px]">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  {availableItems.map((availableItem) => (
                    <SelectItem key={availableItem.id} value={availableItem.id} className="text-blue-100 focus:bg-blue-800/30">
                      {availableItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Show variant selector if item has variants */}
              {hasVariants && item.itemId && (
                <Select
                  value={item.variantId || 'none'}
                  onValueChange={(value) => {
                    const actualValue = value === 'none' ? undefined : value;
                    onUpdateItem(item.id, 'variantId', actualValue);
                    const variant = variants.find(v => v.id === value);
                    onUpdateItem(item.id, 'variantName', variant?.variant_name || '');
                  }}
                >
                  <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                    <SelectValue placeholder="Select variant (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-blue-500/30">
                    <SelectItem value="none" className="text-blue-100 focus:bg-blue-800/30">
                      Parent Item (No variant)
                    </SelectItem>
                    {variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id} className="text-blue-100 focus:bg-blue-800/30">
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
          className="neon-border bg-slate-800/50 text-blue-100 w-24"
          min="1"
        />
      </TableCell>
      
      <TableCell>
        <Input
          type="number"
          step="0.01"
          value={item.unitPrice || ''}
          onChange={(e) => onUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
          className="neon-border bg-slate-800/50 text-blue-100 w-28"
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
              className="neon-border bg-slate-800/50 text-blue-100 w-28"
              min="0"
            />
          </TableCell>
          
          <TableCell>
            <Input
              type="number"
              step="0.01"
              value={item.newItemCostPrice || ''}
              onChange={(e) => onUpdateItem(item.id, 'newItemCostPrice', parseFloat(e.target.value) || 0)}
              className="neon-border bg-slate-800/50 text-blue-100 w-28"
              min="0"
            />
          </TableCell>
        </>
      )}
      
      <TableCell className="text-cyan-300 font-semibold">
        ₹{item.totalPrice.toFixed(2)}
      </TableCell>
      
      <TableCell>
        <Button
          type="button"
          onClick={() => onRemoveItem(item.id)}
          disabled={!canRemove}
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
