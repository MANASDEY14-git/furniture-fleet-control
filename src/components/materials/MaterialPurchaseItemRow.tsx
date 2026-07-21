import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/utils/currencyUtils';
import type { MaterialPurchaseItem } from '@/components/MultiMaterialPurchaseForm';

interface Material {
  id: string;
  name: string;
  unit?: string | null;
  quantity_available?: number | null;
}

interface MaterialPurchaseItemRowProps {
  item: MaterialPurchaseItem;
  index: number;
  materials: Material[];
  onUpdateItem: (id: string, field: keyof MaterialPurchaseItem, value: any) => void;
  onRemoveItem: (id: string) => void;
  canRemove: boolean;
}

export default function MaterialPurchaseItemRow({
  item,
  index,
  materials,
  onUpdateItem,
  onRemoveItem,
  canRemove
}: MaterialPurchaseItemRowProps) {
  return (
    <TableRow className="border-blue-500/20 hover:bg-blue-900/20">
      <TableCell>
        <Select
          value={item.materialId}
          onValueChange={value => onUpdateItem(item.id, 'materialId', value)}
        >
          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100 w-full">
            <SelectValue placeholder="Select material" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-blue-500/30 z-50">
            {materials.map(material => (
              <SelectItem
                key={material.id}
                value={material.id}
                className="text-blue-100 focus:bg-blue-800/30"
              >
                {material.name} (Stock: {material.quantity_available || 0} {material.unit || 'units'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.quantity || ''}
          onChange={e => onUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
          placeholder="0"
          className="neon-border bg-slate-800/50 text-blue-100 w-full"
        />
      </TableCell>
      <TableCell className="text-blue-200">
        {item.unit || '-'}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.unitCost || ''}
          onChange={e => onUpdateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          className="neon-border bg-slate-800/50 text-blue-100 w-full"
        />
      </TableCell>
      <TableCell className="text-right font-medium text-green-400">
        {formatCurrency(item.totalCost)}
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemoveItem(item.id)}
          disabled={!canRemove}
          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
