import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Layers } from 'lucide-react';
import type { InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

interface CategoryIntelligenceProps {
  items: InventoryIntelligenceItem[];
}

function formatCurrency(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export function CategoryIntelligence({ items }: CategoryIntelligenceProps) {
  const catMap = new Map<
    string,
    { count: number; value: number; cost: number; revenue: number; profit: number; ageSum: number; fastCount: number; slowCount: number }
  >();

  items.forEach(i => {
    const catName = i.category_name || 'Uncategorized';
    const curr = catMap.get(catName) || {
      count: 0,
      value: 0,
      cost: 0,
      revenue: 0,
      profit: 0,
      ageSum: 0,
      fastCount: 0,
      slowCount: 0,
    };

    curr.count += 1;
    curr.value += i.inventory_value;
    curr.cost += i.inventory_cost;
    curr.revenue += i.revenue_period;
    curr.profit += i.gross_profit_period;
    curr.ageSum += i.stock_age_days;
    if (i.reorder_status === 'Reorder Soon' || i.monthly_velocity > 2) curr.fastCount += 1;
    if (i.stock_age_days > 180) curr.slowCount += 1;

    catMap.set(catName, curr);
  });

  const categories = Array.from(catMap.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    value: data.value,
    cost: data.cost,
    revenue: data.revenue,
    profit: data.profit,
    avgAge: data.count > 0 ? Math.round(data.ageSum / data.count) : 0,
    fastCount: data.fastCount,
    slowCount: data.slowCount,
  })).sort((a, b) => b.value - a.value);

  const chartData = categories.slice(0, 8).map(c => ({
    name: c.name,
    'Inventory Value': c.value,
    Revenue: c.revenue,
  }));

  return (
    <Card className="border shadow-sm">
      <CardHeader className="p-4 pb-2 border-b">
        <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-500" />
            <span>Category Performance Intelligence</span>
          </div>
          <span className="text-xs font-normal text-muted-foreground">{categories.length} Active Categories</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Avg Age</TableHead>
                <TableHead className="text-right">Stock Value</TableHead>
                <TableHead className="text-right">Period Revenue</TableHead>
                <TableHead className="text-right">Gross Profit</TableHead>
                <TableHead className="text-right">Fast Movers</TableHead>
                <TableHead className="text-right">Slow / Cash Locked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(c => (
                <TableRow key={c.name} className="hover:bg-muted/50">
                  <TableCell className="font-semibold text-xs text-foreground">{c.name}</TableCell>
                  <TableCell className="text-right text-xs">{c.count}</TableCell>
                  <TableCell className="text-right text-xs font-medium">{c.avgAge} days</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{formatCurrency(c.value)}</TableCell>
                  <TableCell className="text-right text-xs font-medium">{formatCurrency(c.revenue)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold text-emerald-600">{formatCurrency(c.profit)}</TableCell>
                  <TableCell className="text-right text-xs font-medium text-emerald-600">{c.fastCount}</TableCell>
                  <TableCell className="text-right text-xs font-medium text-amber-600">{c.slowCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Horizontal Bar Chart */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground">Top Categories by Inventory Value vs. Revenue</h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" tickFormatter={(v) => `₹${v >= 100000 ? `${(v/100000).toFixed(1)}L` : v}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="Inventory Value" fill="#a855f7" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
