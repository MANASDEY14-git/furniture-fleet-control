import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Image as ImageIcon, TrendingUp, Sparkles } from 'lucide-react';
import type { InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

interface HeroProductAnalyticsProps {
  items: InventoryIntelligenceItem[];
  onSelectProduct: (item: InventoryIntelligenceItem) => void;
}

function formatCurrency(val: number): string {
  return `₹${val.toLocaleString('en-IN')}`;
}

export function HeroProductAnalytics({ items, onSelectProduct }: HeroProductAnalyticsProps) {
  const heroItems = [...items]
    .sort((a, b) => b.hero_score - a.hero_score)
    .slice(0, 10);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="p-4 pb-2 border-b">
        <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>Top 10 Hero Products</span>
          </div>
          <span className="text-xs font-normal text-muted-foreground">Weighted score (revenue, profit, velocity & stock)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">Rank</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Hero Score</TableHead>
                <TableHead className="text-right">Period Revenue</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
                <TableHead className="text-right">Units Sold</TableHead>
                <TableHead className="text-right">In Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heroItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-sm text-muted-foreground">
                    No product data available in selected period.
                  </TableCell>
                </TableRow>
              ) : (
                heroItems.map((item, index) => {
                  const rank = index + 1;
                  const rankColor =
                    rank === 1 ? 'bg-amber-500 text-white font-bold' :
                    rank === 2 ? 'bg-slate-300 text-slate-900 font-bold' :
                    rank === 3 ? 'bg-amber-700 text-white font-bold' :
                    'bg-muted text-muted-foreground';

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => onSelectProduct(item)}
                      className="cursor-pointer hover:bg-muted/60 transition-colors"
                    >
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs ${rankColor}`}>
                          {rank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center overflow-hidden border flex-shrink-0">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground hover:text-primary leading-tight">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.brand ? `Brand: ${item.brand}` : item.supplier_name || 'Generic'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.category_name || 'Uncategorized'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="font-bold text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5"
                        >
                          <Sparkles className="h-3 w-3 mr-1 text-emerald-500 inline" />
                          {item.hero_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-foreground">
                        {formatCurrency(item.revenue_period)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-600">
                        {formatCurrency(item.gross_profit_period)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {item.units_sold_period}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {item.quantity_available}
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
