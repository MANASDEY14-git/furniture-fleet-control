
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Package, Trash2, Edit, AlertTriangle } from 'lucide-react';
import { useItems, useUpdateItem, useDeleteItem } from '@/hooks/useItems';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface BulkOperationsPanelProps {
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
}

export default function BulkOperationsPanel({ selectedItems, onSelectionChange }: BulkOperationsPanelProps) {
  const [operation, setOperation] = useState<'price-update' | 'quantity-update' | 'delete'>('price-update');
  const [priceMultiplier, setPriceMultiplier] = useState('1.1');
  const [quantityChange, setQuantityChange] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const isMobile = useIsMobile();
  
  const { data: items = [] } = useItems();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();
  const { toast } = useToast();

  const selectedItemsData = items.filter(item => selectedItems.includes(item.id));

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(item => item.id));
    }
  };

  const handleBulkOperation = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to perform bulk operations",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      switch (operation) {
        case 'price-update':
          const multiplier = parseFloat(priceMultiplier);
          if (isNaN(multiplier) || multiplier <= 0) {
            throw new Error('Invalid price multiplier');
          }
          
          for (const item of selectedItemsData) {
            await updateItem.mutateAsync({
              id: item.id,
              selling_price: Math.round(item.selling_price * multiplier * 100) / 100,
            });
          }
          
          toast({
            title: "Prices Updated",
            description: `Updated prices for ${selectedItems.length} items`,
          });
          break;

        case 'quantity-update':
          const change = parseInt(quantityChange);
          if (isNaN(change)) {
            throw new Error('Invalid quantity change');
          }
          
          for (const item of selectedItemsData) {
            const newQuantity = Math.max(0, item.quantity_available + change);
            await updateItem.mutateAsync({
              id: item.id,
              quantity_available: newQuantity,
            });
          }
          
          toast({
            title: "Quantities Updated",
            description: `Updated quantities for ${selectedItems.length} items`,
          });
          break;

        case 'delete':
          for (const itemId of selectedItems) {
            await deleteItem.mutateAsync(itemId);
          }
          
          toast({
            title: "Items Deleted",
            description: `Deleted ${selectedItems.length} items`,
          });
          break;
      }
      
      onSelectionChange([]);
    } catch (error) {
      toast({
        title: "Operation Failed",
        description: error instanceof Error ? error.message : "Failed to perform bulk operation",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="simple-card">
      <CardHeader className={isMobile ? 'pb-3' : ''}>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Bulk Operations
          {selectedItems.length > 0 && (
            <span className="text-sm text-muted-foreground">({selectedItems.length} selected)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'pt-0 space-y-3' : 'space-y-4'}`}>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedItems.length === items.length && items.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="text-foreground">
            Select All Items ({items.length})
          </Label>
        </div>

        {selectedItems.length > 0 && (
          <>
            <div className="space-y-2">
              <Label className="text-foreground">Operation Type</Label>
              <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-update">Update Prices</SelectItem>
                  <SelectItem value="quantity-update">Update Quantities</SelectItem>
                  <SelectItem value="delete">Delete Items</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {operation === 'price-update' && (
              <div className="space-y-2">
                <Label className="text-foreground">Price Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(e.target.value)}
                  placeholder="1.1 for 10% increase"
                />
                <p className="text-xs text-muted-foreground">
                  Example: 1.1 = 10% increase, 0.9 = 10% decrease
                </p>
              </div>
            )}

            {operation === 'quantity-update' && (
              <div className="space-y-2">
                <Label className="text-foreground">Quantity Change</Label>
                <Input
                  type="number"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                  placeholder="10 to add, -5 to subtract"
                />
                <p className="text-xs text-muted-foreground">
                  Positive numbers add stock, negative numbers subtract
                </p>
              </div>
            )}

            {operation === 'delete' && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">
                  This will permanently delete {selectedItems.length} items. This action cannot be undone.
                </p>
              </div>
            )}

            <Button
              onClick={handleBulkOperation}
              disabled={isProcessing}
              className={`w-full ${
                operation === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''
              }`}
              size={isMobile ? "lg" : "default"}
            >
              {isProcessing ? 'Processing...' : `Apply to ${selectedItems.length} Items`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
