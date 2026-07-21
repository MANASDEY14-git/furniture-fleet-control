import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Trash2, Package, DollarSign } from 'lucide-react';
import { useUpdateItem, useDeleteItem, type Item } from '@/hooks/useItems';
import { useToast } from '@/hooks/use-toast';

interface MobileBulkOperationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: string[];
  items: Item[];
  onClearSelection: () => void;
}

export default function MobileBulkOperationsSheet({
  isOpen,
  onClose,
  selectedItems,
  items,
  onClearSelection
}: MobileBulkOperationsSheetProps) {
  const [operation, setOperation] = useState<'price-update' | 'quantity-update' | 'delete'>('price-update');
  const [priceMultiplier, setPriceMultiplier] = useState('1.1');
  const [quantityChange, setQuantityChange] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const { toast } = useToast();

  const selectedItemsData = items.filter(item => selectedItems.includes(item.id));

  const handleBulkOperation = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to perform bulk operations.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const promises = selectedItemsData.map(async (item) => {
        switch (operation) {
          case 'price-update':
            const multiplier = parseFloat(priceMultiplier);
            return updateItem.mutateAsync({
              id: item.id,
              selling_price: item.selling_price * multiplier,
            });
          
          case 'quantity-update':
            const change = parseInt(quantityChange);
            return updateItem.mutateAsync({
              id: item.id,
              quantity_available: Math.max(0, item.quantity_available + change),
            });
          
          case 'delete':
            return deleteItem.mutateAsync(item.id);
          
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);

      const operationNames = {
        'price-update': 'Price update',
        'quantity-update': 'Quantity update',
        'delete': 'Delete'
      };

      toast({
        title: "Bulk operation completed",
        description: `${operationNames[operation]} applied to ${selectedItems.length} items.`,
      });

      onClearSelection();
      onClose();
    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast({
        title: "Bulk operation failed",
        description: "Some operations may have failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onClearSelection();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold">Bulk Operations</SheetTitle>
              <SheetDescription className="text-base mt-1">
                Manage {selectedItems.length} selected items
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6">
          <div className="space-y-6">
            {/* Operation Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Choose Operation</Label>
              <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-update" className="py-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span>Update Prices</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="quantity-update" className="py-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>Update Quantities</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="delete" className="py-3">
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Items</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Operation-specific inputs */}
            {operation === 'price-update' && (
              <div className="space-y-3">
                <Label htmlFor="priceMultiplier" className="text-base font-medium">
                  Price Multiplier
                </Label>
                <Input
                  id="priceMultiplier"
                  type="number"
                  step="0.1"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(e.target.value)}
                  className="h-12 text-base"
                  placeholder="1.1 (10% increase)"
                />
                <p className="text-sm text-muted-foreground">
                  Multiply current prices by this value (e.g., 1.1 for 10% increase)
                </p>
              </div>
            )}

            {operation === 'quantity-update' && (
              <div className="space-y-3">
                <Label htmlFor="quantityChange" className="text-base font-medium">
                  Quantity Change
                </Label>
                <Input
                  id="quantityChange"
                  type="number"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                  className="h-12 text-base"
                  placeholder="10 (add 10) or -5 (subtract 5)"
                />
                <p className="text-sm text-muted-foreground">
                  Add or subtract from current quantities (use negative numbers to subtract)
                </p>
              </div>
            )}

            {operation === 'delete' && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <Trash2 className="w-4 h-4" />
                  <span className="font-medium">Warning</span>
                </div>
                <p className="text-sm">
                  This will permanently delete {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''}. 
                  This action cannot be undone.
                </p>
              </div>
            )}

            {/* Selected Items Preview */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Selected Items ({selectedItems.length})</Label>
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {selectedItemsData.slice(0, 5).map((item) => (
                  <div key={item.id} className="p-3 border-b last:border-b-0 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {item.quantity_available} | Price: ${item.selling_price}
                      </p>
                    </div>
                  </div>
                ))}
                {selectedItemsData.length > 5 && (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    ... and {selectedItemsData.length - 5} more items
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t pt-4 space-y-3">
          <Button
            onClick={handleBulkOperation}
            disabled={isProcessing}
            className="w-full h-12 text-base font-semibold"
            variant={operation === 'delete' ? 'destructive' : 'default'}
          >
            {isProcessing ? 'Processing...' : `Apply to ${selectedItems.length} Items`}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full h-12 text-base"
            disabled={isProcessing}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}