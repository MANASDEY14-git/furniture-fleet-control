import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Zap, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

interface FastMovingProductsProps {
  items: InventoryIntelligenceItem[];
  onSelectProduct: (item: InventoryIntelligenceItem) => void;
}

export function FastMovingProducts({ items, onSelectProduct }: FastMovingProductsProps) {
  const fastMovingItems = [...items]
    .filter(i => i.monthly_velocity > 0 || i.reorder_status === 'Reorder Soon')
    .sort((a, b) => a.days_to_sell - b.days_to_sell)
    .slice(0, 15);

  const getReorderDate = (days: number): string => {
    if (days > 365) return 'N/A';
    const d = new Date();
    d.setDate(d.getDate() + Math.round(days));
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="p-4 pb-2 border-b">
        <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span>Fast-Moving & Reorder Recommendations</span>
          </div>
          <span className="text-xs font-normal text-muted-foreground">Threshold: &lt;14 days reorder alert</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Monthly Velocity</TableHead>
                <TableHead className="text-right">Stock Coverage</TableHead>
                <TableHead className="text-center">Suggested Reorder</TableHead>
                <TableHead className="text-center">Reorder Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fastMovingItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">
                    No active velocity recorded for items in this period.
                  </TableCell>
                </TableRow>
              ) : (
                fastMovingItems.map(item => {
                  const daysToSell = Math.round(item.days_to_sell);
                  const isUrgent = item.reorder_status === 'Reorder Soon';

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => onSelectProduct(item)}
                      className={`cursor-pointer hover:bg-muted/60 transition-colors ${
                        isUrgent ? 'bg-rose-500/5 hover:bg-rose-500/10' : ''
                      }`}
                    >
                      <TableCell className="font-medium text-xs text-foreground">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.category_name || 'Uncategorized'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {item.quantity_available}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium text-emerald-600">
                        {item.monthly_velocity} units/mo
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {daysToSell > 365 ? '>365 days' : `${daysToSell} days`}
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">
                        {getReorderDate(daysToSell)}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.reorder_status === 'Reorder Soon' && (
                          <Badge variant="destructive" className="text-[11px] gap-1 py-0.5 px-2 font-semibold">
                            <AlertCircle className="h-3 w-3" />
                            Reorder Soon
                          </Badge>
                        )}
                        {item.reorder_status === 'Healthy' && (
                          <Badge variant="outline" className="text-[11px] gap-1 py-0.5 px-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Healthy
                          </Badge>
                        )}
                        {item.reorder_status === 'Overstocked' && (
                          <Badge variant="outline" className="text-[11px] gap-1 py-0.5 px-2 bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">
                            <Clock className="h-3 w-3" />
                            Overstocked
                          </Badge>
                        )}
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
