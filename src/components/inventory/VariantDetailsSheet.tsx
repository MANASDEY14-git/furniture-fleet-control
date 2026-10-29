import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/utils/currencyUtils';
import { Package, DollarSign, TrendingUp, Hash, ClipboardEdit } from 'lucide-react';
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

interface VariantDetailsSheetProps {
  trigger: React.ReactNode;
  itemName: string;
  variants: ItemVariant[];
  parentItem?: Item;
  allItems?: Item[];
}

export default function VariantDetailsSheet({ trigger, itemName, variants, parentItem, allItems }: VariantDetailsSheetProps) {
  const totalStock = variants.reduce((sum, v) => sum + v.quantity_available, 0);
  const itemsList = allItems && allItems.length > 0 ? allItems : (parentItem ? [parentItem] : []);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle className="text-left flex items-center justify-between">
            <span className="truncate">Variants: {itemName}</span>
          </SheetTitle>
          <div className="text-sm text-muted-foreground text-left">
            {variants.length} variant{variants.length !== 1 ? 's' : ''} • Total Available Stock: <strong className="text-foreground">{totalStock}</strong>
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(80vh-100px)] mt-4">
          <div className="space-y-4 pr-1">
            {variants.map((variant, index) => {
              const isLowStock = variant.quantity_available < 5;
              const profit = variant.selling_price - variant.cost_price;
              const profitMargin = variant.cost_price > 0 
                ? ((profit / variant.cost_price) * 100).toFixed(1)
                : '0';

              return (
                <div key={variant.id}>
                  {index > 0 && <Separator className="mb-4" />}
                  
                  <div className="space-y-4 p-4 border rounded-lg bg-card">
                    {/* Variant Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-semibold text-base mb-1 truncate" title={variant.variant_name}>
                          {variant.variant_name}
                        </h3>
                        {variant.sku && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Hash className="w-3 h-3" />
                            <span>SKU: {variant.sku}</span>
                          </div>
                        )}
                      </div>
                      {isLowStock && (
                        <Badge variant="destructive" className="text-xs flex-shrink-0">
                          Low Stock
                        </Badge>
                      )}
                    </div>

                    {/* Variant Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Package className="w-3 h-3" />
                          <span>Quantity</span>
                        </div>
                        <p className={`text-sm font-semibold ${isLowStock ? 'text-destructive font-bold' : ''}`}>
                          {variant.quantity_available} units
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="w-3 h-3" />
                          <span>Selling Price</span>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatCurrency(variant.selling_price)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="w-3 h-3" />
                          <span>Cost Price</span>
                        </div>
                        <p className="text-sm font-medium">
                          {formatCurrency(variant.cost_price)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          <span>Profit Margin</span>
                        </div>
                        <p className={`text-sm font-medium ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profitMargin}%
                        </p>
                      </div>
                    </div>

                    {/* 1-click Floor Stocktake / Adjust for this Variant */}
                    <div className="pt-2">
                      <StockAdjustmentDialog
                        items={itemsList}
                        defaultItemId={parentItem?.id}
                        defaultVariantId={variant.id}
                        triggerButton={
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-9 text-xs font-medium text-amber-500 border-amber-500/40 hover:bg-amber-500/10 gap-1.5"
                          >
                            <ClipboardEdit className="w-3.5 h-3.5" />
                            Audit & Adjust Variant Stock
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
