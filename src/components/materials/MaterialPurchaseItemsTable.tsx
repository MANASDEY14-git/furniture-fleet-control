import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/utils/currencyUtils';
import MaterialPurchaseItemRow from './MaterialPurchaseItemRow';
import MobileMaterialPurchaseCard from './MobileMaterialPurchaseCard';
import type { MaterialPurchaseItem } from '@/components/MultiMaterialPurchaseForm';

interface Material {
  id: string;
  name: string;
  unit?: string | null;
  quantity_available?: number | null;
}

interface MaterialPurchaseItemsTableProps {
  items: MaterialPurchaseItem[];
  materials: Material[];
  onAddItem: () => void;
  onUpdateItem: (id: string, field: keyof MaterialPurchaseItem, value: any) => void;
  onRemoveItem: (id: string) => void;
  getTotalAmount: () => number;
  itemsSubtotal: number;
  roundOff: string;
  onRoundOffChange: (value: string) => void;
}

export default function MaterialPurchaseItemsTable({
  items,
  materials,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  getTotalAmount,
  itemsSubtotal,
  roundOff,
  onRoundOffChange
}: MaterialPurchaseItemsTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-blue-200 font-medium">Materials</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddItem}
            className="neon-border bg-slate-800/50 text-cyan-300"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Material
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <MobileMaterialPurchaseCard
              key={item.id}
              item={item}
              index={index}
              materials={materials}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
              canRemove={items.length > 1}
            />
          ))}
        </div>

        <div className="rounded-lg p-4 space-y-2 bg-gradient-to-r from-green-400/10 to-cyan-400/10 border border-green-500/30">
          <div className="flex justify-between items-center text-sm text-blue-200">
            <span>Items Subtotal</span>
            <span>{formatCurrency(itemsSubtotal)}</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <Label htmlFor="material-purchase-round-off-mobile" className="text-sm text-blue-200">Round Off</Label>
            <Input
              id="material-purchase-round-off-mobile"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={roundOff}
              onChange={e => onRoundOffChange(e.target.value)}
              className="h-9 w-28 text-right bg-slate-900 border-blue-500/40 text-blue-100 placeholder-blue-400"
            />
          </div>
          <div className="flex justify-between items-center border-t border-blue-500/30 pt-2">
            <span className="text-sm font-medium text-blue-200">Total Amount</span>
            <span className="text-xl font-bold text-cyan-300">
              {formatCurrency(getTotalAmount())}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-blue-200 font-medium">Materials</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddItem}
          className="neon-border bg-slate-800/50 text-cyan-300"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Material
        </Button>
      </div>

      <div className="rounded-lg border border-blue-500/20 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-blue-500/30 bg-slate-800/50">
              <TableHead className="text-blue-200">Material</TableHead>
              <TableHead className="text-blue-200 w-24">Quantity</TableHead>
              <TableHead className="text-blue-200 w-20">Unit</TableHead>
              <TableHead className="text-blue-200 w-32">Unit Cost</TableHead>
              <TableHead className="text-blue-200 w-32 text-right">Total</TableHead>
              <TableHead className="text-blue-200 w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <MaterialPurchaseItemRow
                key={item.id}
                item={item}
                index={index}
                materials={materials}
                onUpdateItem={onUpdateItem}
                onRemoveItem={onRemoveItem}
                canRemove={items.length > 1}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <div className="rounded-lg px-6 py-3 space-y-2 min-w-[18rem] bg-gradient-to-r from-green-400/10 to-cyan-400/10 border border-green-500/30">
          <div className="flex justify-between items-center text-sm text-blue-200">
            <span>Items Subtotal</span>
            <span>{formatCurrency(itemsSubtotal)}</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <Label htmlFor="material-purchase-round-off" className="text-sm text-blue-200">Round Off</Label>
            <Input
              id="material-purchase-round-off"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={roundOff}
              onChange={e => onRoundOffChange(e.target.value)}
              className="h-9 w-32 text-right bg-slate-900 border-blue-500/40 text-blue-100 placeholder-blue-400"
            />
          </div>
          <div className="flex justify-between items-center border-t border-blue-500/30 pt-2">
            <span className="text-sm font-medium text-blue-200">Total Amount</span>
            <span className="text-lg font-bold text-cyan-300">
              {formatCurrency(getTotalAmount())}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
