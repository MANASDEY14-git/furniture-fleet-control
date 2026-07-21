import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/currencyUtils';
import { Package } from 'lucide-react';

interface ItemVariant {
  id: string;
  variant_name: string;
  sku?: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  is_active: boolean;
}

interface VariantStockTableProps {
  variants: ItemVariant[];
}

export default function VariantStockTable({ variants }: VariantStockTableProps) {
  if (!variants || variants.length === 0) {
    return (
      <TableRow className="bg-muted/50">
        <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
          No variants found
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {variants.map((variant) => {
        const isLowStock = variant.quantity_available < 5;
        
        return (
          <TableRow key={variant.id} className="bg-muted/30 hover:bg-muted/50">
            <TableCell className="pl-12">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{variant.variant_name}</div>
                  {variant.sku && (
                    <div className="text-xs text-muted-foreground">SKU: {variant.sku}</div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>—</TableCell>
            <TableCell>—</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className={isLowStock ? 'text-destructive font-semibold' : ''}>
                  {variant.quantity_available}
                </span>
                {isLowStock && (
                  <Badge variant="destructive" className="text-xs">Low</Badge>
                )}
              </div>
            </TableCell>
            <TableCell>{formatCurrency(variant.cost_price)}</TableCell>
            <TableCell>{formatCurrency(variant.selling_price)}</TableCell>
            <TableCell>—</TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
