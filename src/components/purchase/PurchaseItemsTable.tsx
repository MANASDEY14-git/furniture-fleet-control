import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PurchaseItemRow from './PurchaseItemRow';
import MobilePurchaseItemCard from './MobilePurchaseItemCard';
import { useIsMobile } from '@/hooks/use-mobile';
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
  currentSupplierId?: string;
}

export default function PurchaseItemsTable({
  items,
  availableItems,
  categories,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  getTotalAmount,
  currentSupplierId
}: PurchaseItemsTableProps) {
  const isMobile = useIsMobile();
  const hasNewItems = items.some(item => item.isNewItem);

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">Items</h3>
          <Button
            type="button"
            onClick={onAddItem}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <MobilePurchaseItemCard
              key={item.id}
              item={item}
              index={index}
              availableItems={availableItems}
              categories={categories}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
              canRemove={items.length > 1}
            />
          ))}
        </div>

        <div className="bg-primary/10 rounded-md px-4 py-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-foreground">Total Amount</span>
            <span className="text-xl font-bold text-foreground">
              ₹{getTotalAmount().toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Items</h3>
        <Button
          type="button"
          onClick={onAddItem}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-muted-foreground">Item</TableHead>
              <TableHead className="text-muted-foreground">Quantity</TableHead>
              <TableHead className="text-muted-foreground">Unit Price (Cost)</TableHead>
              {hasNewItems && (
                <>
                  <TableHead className="text-muted-foreground">Selling Price</TableHead>
                  <TableHead className="text-muted-foreground">Cost Price</TableHead>
                </>
              )}
              <TableHead className="text-muted-foreground">Total</TableHead>
              <TableHead className="text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <PurchaseItemRow
                key={item.id}
                item={item}
                availableItems={availableItems}
                categories={categories}
                onUpdateItem={onUpdateItem}
                onRemoveItem={onRemoveItem}
                canRemove={items.length > 1}
                currentSupplierId={currentSupplierId}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <div className="bg-primary/10 rounded-md px-6 py-3">
          <span className="text-lg font-bold text-foreground">
            Total Amount: ₹{getTotalAmount().toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
