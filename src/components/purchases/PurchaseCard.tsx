import { Package2, Store, User, Calendar, FileText, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/currencyUtils';
import { useIsMobile } from '@/hooks/use-mobile';

interface PurchaseCardProps {
  purchase: any;
  storeName: string;
  supplierName: string;
}

export default function PurchaseCard({ purchase, storeName, supplierName }: PurchaseCardProps) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <Card className="futuristic-card hover:border-cyan-400/50 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Package2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-blue-100 truncate">{purchase.item_name}</h3>
              {purchase.invoice_number && (
                <p className="text-xs text-blue-300 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {purchase.invoice_number}
                </p>
              )}
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-400/30">
            Completed
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1">
            <p className="text-xs text-blue-300 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Date
            </p>
            <p className="text-sm text-blue-200">
              {new Date(purchase.date).toLocaleDateString('en-GB')}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-blue-300">Quantity</p>
            <p className="text-sm font-semibold text-cyan-300">
              {purchase.quantity}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-blue-300 flex items-center gap-1">
              <Store className="w-3 h-3" />
              Store
            </p>
            <p className="text-sm text-blue-200 truncate">{storeName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-blue-300 flex items-center gap-1">
              <User className="w-3 h-3" />
              Supplier
            </p>
            <p className="text-sm text-blue-200 truncate">{supplierName}</p>
          </div>
        </div>

        <div className="border-t border-blue-500/20 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-300 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Total Cost
            </p>
            <p className="text-lg font-bold text-cyan-300">
              {formatCurrency(purchase.total_cost || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}