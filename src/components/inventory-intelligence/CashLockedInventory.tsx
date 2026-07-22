import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertOctagon, Tag, ArrowRight } from 'lucide-react';
import type { InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

interface CashLockedInventoryProps {
  items: InventoryIntelligenceItem[];
  onSelectProduct: (item: InventoryIntelligenceItem) => void;
}

function formatCurrency(val: number): string {
  return `₹${val.toLocaleString('en-IN')}`;
}

export function CashLockedInventory({ items, onSelectProduct }: CashLockedInventoryProps) {
  const cashLockedItems = [...items]
    .filter(i => i.stock_age_days > 180)
    .sort((a, b) => b.cash_locked - a.cash_locked);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'Clearance Sale':
        return <Badge variant="destructive" className="font-semibold text-[11px] px-2 py-0.5">Clearance Sale</Badge>;
      case 'Discount':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 font-medium text-[11px] px-2 py-0.5">Discount 20%+</Badge>;
      case 'Bundle':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium text-[11px] px-2 py-0.5">Bundle Deal</Badge>;
      case 'Increase Marketing':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-medium text-[11px] px-2 py-0.5">Marketing Push</Badge>;
      default:
        return <Badge variant="secondary" className="font-normal text-[11px] px-2 py-0.5">Keep Normal</Badge>;
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="p-4 pb-2 border-b">
        <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500" />
            <span>Cash-Locked Inventory (&gt;180 Days)</span>
          </div>
          <span className="text-xs font-normal text-muted-foreground">Highlighted red if &gt;365 days</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-center">Receive Date</TableHead>
                <TableHead className="text-right">Stock Age</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Cash Locked</TableHead>
                <TableHead className="text-center">Recommended Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashLockedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-sm text-muted-foreground">
                    No cash locked items older than 180 days! Great inventory turnover.
                  </TableCell>
                </TableRow>
              ) : (
                cashLockedItems.map(item => {
                  const isCriticalDead = item.stock_age_days > 365;

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => onSelectProduct(item)}
                      className={`cursor-pointer hover:bg-muted/60 transition-colors ${
                        isCriticalDead ? 'bg-red-500/10 border-l-4 border-l-red-500 hover:bg-red-500/15' : ''
                      }`}
                    >
                      <TableCell className="font-semibold text-xs text-foreground">
                        {item.name}
                        {isCriticalDead && (
                          <span className="ml-2 text-[10px] text-rose-600 font-normal inline-flex items-center gap-0.5">
                            <AlertOctagon className="h-3 w-3 inline" /> &gt;365d
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.category_name || 'Uncategorized'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.supplier_name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">
                        {item.stock_receive_date || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-amber-600">
                        {item.stock_age_days} days
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {item.quantity_available}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {formatCurrency(item.cost_price)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold text-rose-600">
                        {formatCurrency(item.cash_locked)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getActionBadge(item.recommended_action)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
