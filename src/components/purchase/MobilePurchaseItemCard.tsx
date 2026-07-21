import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Item } from '@/types';

interface PurchaseItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isNewItem: boolean;
  newItemName: string;
  newItemSellingPrice: number;
  newItemCostPrice: number;
  newItemCategoryId: string;
}

interface MobilePurchaseItemCardProps {
  item: PurchaseItem;
  index: number;
  availableItems: Item[];
  categories: any[];
  onUpdateItem: (id: string, field: keyof PurchaseItem, value: any) => void;
  onRemoveItem: (id: string) => void;
  canRemove: boolean;
}

export default function MobilePurchaseItemCard({
  item,
  index,
  availableItems,
  categories,
  onUpdateItem,
  onRemoveItem,
  canRemove
}: MobilePurchaseItemCardProps) {
  return (
    <Card className="futuristic-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-cyan-300">Item #{index + 1}</span>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemoveItem(item.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* New Item Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={item.isNewItem}
            onCheckedChange={(checked) => onUpdateItem(item.id, 'isNewItem', checked)}
          />
          <Label className="text-sm text-blue-200">New Item</Label>
        </div>

        {item.isNewItem ? (
          <>
            {/* New Item Fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-blue-200">Item Name</Label>
                <Input
                  placeholder="Enter item name"
                  value={item.newItemName}
                  onChange={(e) => onUpdateItem(item.id, 'newItemName', e.target.value)}
                  className="neon-border bg-slate-800/50 text-blue-100"
                />
              </div>
              <div>
                <Label className="text-xs text-blue-200">Category</Label>
                <Select
                  value={item.newItemCategoryId}
                  onValueChange={(value) => onUpdateItem(item.id, 'newItemCategoryId', value)}
                >
                  <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-blue-500/30">
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id}
                        className="text-blue-100 focus:bg-blue-800/30"
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-blue-200">Selling Price</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={item.newItemSellingPrice || ''}
                    onChange={(e) => onUpdateItem(item.id, 'newItemSellingPrice', parseFloat(e.target.value) || 0)}
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                </div>
                <div>
                  <Label className="text-xs text-blue-200">Cost Price</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={item.newItemCostPrice || ''}
                    onChange={(e) => onUpdateItem(item.id, 'newItemCostPrice', parseFloat(e.target.value) || 0)}
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Existing Item Selector */}
            <div>
              <Label className="text-xs text-blue-200">Select Item</Label>
              <Select
                value={item.itemId}
                onValueChange={(value) => onUpdateItem(item.id, 'itemId', value)}
              >
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30 max-h-[200px]">
                  {availableItems.map((availableItem) => (
                    <SelectItem
                      key={availableItem.id}
                      value={availableItem.id}
                      className="text-blue-100 focus:bg-blue-800/30"
                    >
                      {availableItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Quantity and Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-blue-200">Quantity</Label>
            <Input
              type="number"
              placeholder="0"
              value={item.quantity || ''}
              onChange={(e) => onUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
              className="neon-border bg-slate-800/50 text-blue-100"
            />
          </div>
          <div>
            <Label className="text-xs text-blue-200">Unit Price</Label>
            <Input
              type="number"
              placeholder="0"
              value={item.unitPrice || ''}
              onChange={(e) => onUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
              className="neon-border bg-slate-800/50 text-blue-100"
            />
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-2 border-t border-blue-500/20">
          <span className="text-sm text-blue-200">Total</span>
          <span className="text-lg font-bold text-cyan-300">
            ₹{item.totalPrice.toLocaleString('en-IN')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
