import { Package2, Store, User, Calendar, FileText, DollarSign, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/currencyUtils';

interface PurchaseCardProps {
  purchase: any;
  storeName: string;
  supplierName: string;
  onViewDetails: () => void;
}

export default function PurchaseCard({ purchase, storeName, supplierName, onViewDetails }: PurchaseCardProps) {
  const items = purchase.items ? JSON.parse(JSON.stringify(purchase.items)) : null;
  const isMultiItem = items && Array.isArray(items) && items.length > 1;
  const itemCount = isMultiItem ? items.length : 1;

  return (
    <Card className="transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Package2 className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">
                {isMultiItem ? `${itemCount} Items` : purchase.item_name}
              </h3>
              {purchase.invoice_number && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  #{purchase.invoice_number}
                </p>
              )}
            </div>
          </div>
          <Badge className="bg-green-100 text-green-700 shrink-0">
            Completed
          </Badge>
        </div>

        {isMultiItem && (
          <div className="mb-3 p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Items:</p>
            <p className="text-sm text-foreground truncate">
              {items.slice(0, 2).map((i: any) => i.item_name).join(", ")}
              {items.length > 2 && ` +${items.length - 2} more`}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Date
            </p>
            <p className="text-sm text-foreground">
              {new Date(purchase.date).toLocaleDateString('en-GB')}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="text-sm font-semibold text-foreground">
              {purchase.quantity}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Store className="w-3 h-3" />
              Store
            </p>
            <p className="text-sm text-foreground truncate">{storeName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              Supplier
            </p>
            <p className="text-sm text-foreground truncate">{supplierName}</p>
          </div>
        </div>

        <div className="border-t pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Total Cost
            </p>
            <p className="text-lg font-bold text-foreground">
              {formatCurrency(purchase.total_cost || 0)}
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onViewDetails}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
