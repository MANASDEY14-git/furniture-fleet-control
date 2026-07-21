import { Eye, Calendar, Package, FileText, Info, ArrowUp, ArrowDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StockLedgerEntry } from '@/hooks/useStockLedger';
import { format } from 'date-fns';

interface StockMovementDetailsDialogProps {
  movement: StockLedgerEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StockMovementDetailsDialog({
  movement,
  open,
  onOpenChange
}: StockMovementDetailsDialogProps) {
  if (!movement) return null;

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'sale':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'adjustment':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const isIncrease = movement.type === 'purchase' || 
    (movement.type === 'adjustment' && movement.quantity > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-blue-500/30">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Stock Movement Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Overview */}
          <Card className="bg-slate-800/50 border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-300 text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">Item</span>
                <span className="text-white font-medium">{movement.item_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">Type</span>
                <Badge variant="outline" className={getMovementTypeColor(movement.type)}>
                  {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">Quantity</span>
                <div className={`flex items-center gap-1 font-bold ${isIncrease ? 'text-green-400' : 'text-red-400'}`}>
                  {isIncrease ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  {isIncrease ? '+' : '-'}{Math.abs(movement.quantity)}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">Balance After</span>
                <span className="text-white font-bold">{movement.balance}</span>
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card className="bg-slate-800/50 border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-300 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">Unit Price</span>
                <span className="text-white">₹{movement.unit_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">Total Amount</span>
                <span className="text-white font-medium">₹{movement.total_amount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Date & Reference */}
          <Card className="bg-slate-800/50 border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-300 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date & Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-200 text-sm">Date</span>
                <span className="text-white">{format(new Date(movement.date), 'dd MMM yyyy, hh:mm a')}</span>
              </div>
              {movement.reference_number && (
                <div className="flex justify-between items-center">
                  <span className="text-blue-200 text-sm">Reference</span>
                  <span className="text-white font-mono text-sm">{movement.reference_number}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Adjustment Details (only for adjustments) */}
          {movement.type === 'adjustment' && (
            <Card className="bg-slate-800/50 border-orange-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-orange-300 text-sm flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Adjustment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {movement.adjustment_type && (
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200 text-sm">Adjustment Type</span>
                    <Badge variant="outline" className="border-orange-500/30 text-orange-300">
                      {movement.adjustment_type}
                    </Badge>
                  </div>
                )}
                {movement.adjustment_reason && (
                  <div>
                    <span className="text-blue-200 text-sm block mb-1">Reason</span>
                    <p className="text-white text-sm bg-slate-700/50 p-2 rounded">
                      {movement.adjustment_reason}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
