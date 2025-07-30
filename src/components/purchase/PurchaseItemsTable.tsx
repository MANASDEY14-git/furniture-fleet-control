
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PurchaseItemRow from './PurchaseItemRow';
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

interface PurchaseItemsTableProps {
  items: PurchaseItem[];
  availableItems: Item[];
  categories: any[];
  onAddItem: () => void;
  onUpdateItem: (id: string, field: keyof PurchaseItem, value: any) => void;
  onRemoveItem: (id: string) => void;
  getTotalAmount: () => number;
}

export default function PurchaseItemsTable({
  items,
  availableItems,
  categories,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  getTotalAmount
}: PurchaseItemsTableProps) {
  const hasNewItems = items.some(item => item.isNewItem);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-blue-200">Items</h3>
        <Button
          type="button"
          onClick={onAddItem}
          className="cyber-button text-white font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table className="data-grid">
          <TableHeader>
            <TableRow className="border-blue-500/30">
              <TableHead className="text-blue-200">Item</TableHead>
              <TableHead className="text-blue-200">Quantity</TableHead>
              <TableHead className="text-blue-200">Unit Price (Cost)</TableHead>
              {hasNewItems && (
                <>
                  <TableHead className="text-blue-200">Selling Price</TableHead>
                  <TableHead className="text-blue-200">Cost Price</TableHead>
                </>
              )}
              <TableHead className="text-blue-200">Total</TableHead>
              <TableHead className="text-blue-200">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <PurchaseItemRow
                key={item.id}
                item={item}
                availableItems={availableItems}
                categories={categories}
                onUpdateItem={onUpdateItem}
                onRemoveItem={onRemoveItem}
                canRemove={items.length > 1}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <div className="neon-border bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-md px-6 py-3">
          <span className="text-lg font-bold text-cyan-300 glow-text">
            Total Amount: ₹{getTotalAmount().toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
