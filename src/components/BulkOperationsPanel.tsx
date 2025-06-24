
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

interface BulkOperationsPanelProps {
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
}

export default function BulkOperationsPanel({ selectedItems, onSelectionChange }: BulkOperationsPanelProps) {
  const [operation, setOperation] = useState<'price-update' | 'quantity-update' | 'delete'>('price-update');
  const [priceMultiplier, setPriceMultiplier] = useState('1.1');
  const [quantityChange, setQuantityChange] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  
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
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-300 glow-text">
          <Package className="h-5 w-5" />
          Bulk Operations
          {selectedItems.length > 0 && (
            <span className="text-sm text-blue-300">({selectedItems.length} selected)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedItems.length === items.length && items.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="text-blue-200">
            Select All Items ({items.length})
          </Label>
        </div>

        {selectedItems.length > 0 && (
          <>
            <div className="space-y-2">
              <Label className="text-blue-200">Operation Type</Label>
              <Select value={operation} onValueChange={(value: any) => setOperation(value)}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="futuristic-card">
                  <SelectItem value="price-update" className="text-blue-100">Update Prices</SelectItem>
                  <SelectItem value="quantity-update" className="text-blue-100">Update Quantities</SelectItem>
                  <SelectItem value="delete" className="text-blue-100">Delete Items</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {operation === 'price-update' && (
              <div className="space-y-2">
                <Label className="text-blue-200">Price Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(e.target.value)}
                  placeholder="1.1 for 10% increase"
                  className="neon-border bg-slate-800/50 text-blue-100"
                />
                <p className="text-xs text-blue-400">
                  Example: 1.1 = 10% increase, 0.9 = 10% decrease
                </p>
              </div>
            )}

            {operation === 'quantity-update' && (
              <div className="space-y-2">
                <Label className="text-blue-200">Quantity Change</Label>
                <Input
                  type="number"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                  placeholder="10 to add, -5 to subtract"
                  className="neon-border bg-slate-800/50 text-blue-100"
                />
                <p className="text-xs text-blue-400">
                  Positive numbers add stock, negative numbers subtract
                </p>
              </div>
            )}

            {operation === 'delete' && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-sm text-red-300">
                  This will permanently delete {selectedItems.length} items. This action cannot be undone.
                </p>
              </div>
            )}

            <Button
              onClick={handleBulkOperation}
              disabled={isProcessing}
              className={`w-full cyber-button text-white ${
                operation === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''
              }`}
            >
              {isProcessing ? 'Processing...' : `Apply to ${selectedItems.length} Items`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
