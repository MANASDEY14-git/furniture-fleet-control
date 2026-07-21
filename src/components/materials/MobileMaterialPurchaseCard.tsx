import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currencyUtils';
import type { MaterialPurchaseItem } from '@/components/MultiMaterialPurchaseForm';

interface Material {
  id: string;
  name: string;
  unit?: string | null;
  quantity_available?: number | null;
}

interface MobileMaterialPurchaseCardProps {
  item: MaterialPurchaseItem;
  index: number;
  materials: Material[];
  onUpdateItem: (id: string, field: keyof MaterialPurchaseItem, value: any) => void;
  onRemoveItem: (id: string) => void;
  canRemove: boolean;
}

export default function MobileMaterialPurchaseCard({
  item,
  index,
  materials,
  onUpdateItem,
  onRemoveItem,
  canRemove
}: MobileMaterialPurchaseCardProps) {
  return (
    <Card className="futuristic-card">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-200">Material #{index + 1}</span>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveItem(item.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-blue-200 text-sm">Material</Label>
          <Select
            value={item.materialId}
            onValueChange={value => onUpdateItem(item.id, 'materialId', value)}
          >
            <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
              <SelectValue placeholder="Select material" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-blue-500/30 z-50">
              {materials.map(material => (
                <SelectItem
                  key={material.id}
                  value={material.id}
                  className="text-blue-100 focus:bg-blue-800/30"
                >
                  {material.name} ({material.quantity_available || 0} {material.unit || 'units'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-blue-200 text-sm">Quantity {item.unit && `(${item.unit})`}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.quantity || ''}
              onChange={e => onUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="neon-border bg-slate-800/50 text-blue-100"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-blue-200 text-sm">Unit Cost</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.unitCost || ''}
              onChange={e => onUpdateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="neon-border bg-slate-800/50 text-blue-100"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-blue-500/20">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-200">Total</span>
            <span className="text-lg font-bold text-green-400">
              {formatCurrency(item.totalCost)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
