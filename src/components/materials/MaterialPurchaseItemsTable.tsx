import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
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
}

export default function MaterialPurchaseItemsTable({
  items,
  materials,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  getTotalAmount
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

        <div className="p-4 rounded-lg bg-gradient-to-r from-green-400/10 to-cyan-400/10 border border-green-500/30">
          <div className="flex justify-between items-center">
            <span className="text-blue-200 font-medium">Grand Total</span>
            <span className="text-2xl font-bold text-cyan-300">
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
            <TableRow className="border-blue-500/30 bg-gradient-to-r from-green-400/10 to-cyan-400/10">
              <TableCell colSpan={4} className="text-right font-medium text-blue-200">
                Grand Total
              </TableCell>
              <TableCell className="text-right font-bold text-xl text-cyan-300">
                {formatCurrency(getTotalAmount())}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
