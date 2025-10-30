import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/utils/currencyUtils';
import { Package, DollarSign, TrendingUp, Hash } from 'lucide-react';

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
}

export default function VariantDetailsSheet({ trigger, itemName, variants }: VariantDetailsSheetProps) {
  const totalStock = variants.reduce((sum, v) => sum + v.quantity_available, 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle className="text-left">
            Variants: {itemName}
          </SheetTitle>
          <div className="text-sm text-muted-foreground text-left">
            {variants.length} variant{variants.length !== 1 ? 's' : ''} • Total Stock: {totalStock}
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(80vh-100px)] mt-4">
          <div className="space-y-4">
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
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-1">{variant.variant_name}</h3>
                        {variant.sku && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Hash className="w-3 h-3" />
                            <span>SKU: {variant.sku}</span>
                          </div>
                        )}
                      </div>
                      {isLowStock && (
                        <Badge variant="destructive" className="text-xs">
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
                        <p className={`text-sm font-semibold ${isLowStock ? 'text-destructive' : ''}`}>
                          {variant.quantity_available}
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
