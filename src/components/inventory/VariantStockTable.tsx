import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/currencyUtils';
import { Package, ClipboardEdit } from 'lucide-react';
import StockAdjustmentDialog from '@/components/StockAdjustmentDialog';
import type { Item } from '@/hooks/useItems';

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
  parentItem?: Item;
  allItems?: Item[];
}

export default function VariantStockTable({ variants, parentItem, allItems }: VariantStockTableProps) {
  if (!variants || variants.length === 0) {
    return (
      <TableRow className="bg-slate-900/40 border-b border-blue-500/10">
        <TableCell colSpan={9} className="text-center text-muted-foreground py-4 text-xs italic">
          No variants found for this item
        </TableCell>
      </TableRow>
    );
  }

  const itemsList = allItems && allItems.length > 0 ? allItems : (parentItem ? [parentItem] : []);

  return (
    <>
      {variants.map((variant) => {
        const isLowStock = variant.quantity_available < 5;
        
        return (
          <TableRow 
            key={variant.id} 
            className="bg-slate-900/50 hover:bg-slate-900/80 border-b border-blue-500/10 transition-colors"
          >
            {/* 1. Indent / Checkbox placeholder */}
            <TableCell className="w-10 pl-6">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/50" />
            </TableCell>

            {/* 2. Variant Name & SKU */}
            <TableCell className="font-medium text-cyan-200 pl-4 py-2.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-cyan-100 truncate" title={variant.variant_name}>
                    {variant.variant_name}
                  </div>
                  {variant.sku && (
                    <div className="text-xs text-blue-300/70 font-mono">
                      SKU: {variant.sku}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>

            {/* 3. Godown / Store (inherits from parent) */}
            <TableCell className="text-xs text-blue-300/60">
              —
            </TableCell>

            {/* 4. Category */}
            <TableCell className="text-xs text-blue-300/60">
              —
            </TableCell>

            {/* 5. Variant Stock Available */}
            <TableCell>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${isLowStock ? 'text-orange-400 font-bold' : 'text-blue-100'}`}>
                  {variant.quantity_available}
                </span>
                {isLowStock && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 uppercase">
                    Low
                  </Badge>
                )}
              </div>
            </TableCell>

            {/* 6. Cost Price */}
            <TableCell className="text-xs text-blue-200">
              {formatCurrency(variant.cost_price)}
            </TableCell>

            {/* 7. Selling Price */}
            <TableCell className="text-xs text-blue-200">
              {formatCurrency(variant.selling_price)}
            </TableCell>

            {/* 8. Stock Age */}
            <TableCell className="text-xs text-blue-300/60">
              —
            </TableCell>

            {/* 9. Actions: 1-click Floor Audit / Adjust */}
            <TableCell className="text-right pr-4">
              <StockAdjustmentDialog
                items={itemsList}
                defaultItemId={parentItem?.id}
                defaultVariantId={variant.id}
                triggerButton={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs text-amber-300 border-amber-500/40 hover:bg-amber-950/40 hover:text-amber-200 gap-1.5 shadow-sm"
                    title={`Audit & count physical stock for ${variant.variant_name}`}
                  >
                    <ClipboardEdit className="w-3.5 h-3.5" />
                    Audit SKU
                  </Button>
                }
              />
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
