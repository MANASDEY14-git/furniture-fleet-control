import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import type { InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

interface InventoryAgeAnalysisProps {
  items: InventoryIntelligenceItem[];
}

const BUCKET_COLORS = {
  Healthy: '#10b981',      // Emerald
  Watch: '#f59e0b',        // Amber
  'Slow Moving': '#f97316',// Orange
  'Dead Stock': '#ef4444',  // Red
  Critical: '#b91c1c',     // Dark Red
};

function formatCurrency(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export function InventoryAgeAnalysis({ items }: InventoryAgeAnalysisProps) {
  const buckets = [
    { key: 'Healthy', label: 'Healthy (0-180d)', min: 0, max: 180, badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    { key: 'Watch', label: 'Watch (181-270d)', min: 181, max: 270, badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    { key: 'Slow Moving', label: 'Slow Moving (271-365d)', min: 271, max: 365, badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    { key: 'Dead Stock', label: 'Dead Stock (366-540d)', min: 366, max: 540, badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
    { key: 'Critical', label: 'Critical (>540d)', min: 541, max: 9999, badgeClass: 'bg-red-700/10 text-red-700 border-red-700/20' },
  ];

  const totalValueSum = items.reduce((acc, i) => acc + (i.inventory_value || 0), 0);

  const bucketStats = buckets.map(b => {
    const matched = items.filter(i => i.stock_age_bucket === b.key);
    const count = matched.length;
    const quantity = matched.reduce((acc, i) => acc + i.quantity_available, 0);
    const value = matched.reduce((acc, i) => acc + i.inventory_value, 0);
    const cost = matched.reduce((acc, i) => acc + i.inventory_cost, 0);
    const pct = totalValueSum > 0 ? ((value / totalValueSum) * 100).toFixed(1) : '0.0';

    return {
      name: b.key,
      label: b.label,
      badgeClass: b.badgeClass,
      count,
      quantity,
      value,
      cost,
      pct: parseFloat(pct),
      color: BUCKET_COLORS[b.key as keyof typeof BUCKET_COLORS] || '#64748b',
    };
  });

  const chartData = bucketStats.map(b => ({
    name: b.name,
    Value: b.value,
    Cost: b.cost,
  }));

  const pieData = bucketStats.filter(b => b.value > 0).map(b => ({
    name: b.name,
    value: b.value,
    color: b.color,
  }));

  return (
    <Card className="border shadow-sm">
      <CardHeader className="p-4 pb-2 border-b">
        <CardTitle className="text-base font-semibold text-foreground flex items-center justify-between">
          <span>Inventory Stock Age Breakdown</span>
          <span className="text-xs font-normal text-muted-foreground">Threshold: 180+ days cash lock</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Table & Pie Chart Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table */}
          <div className="lg:col-span-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Age Bucket</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Cost Value</TableHead>
                  <TableHead className="text-right">Selling Value</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bucketStats.map(b => (
                  <TableRow key={b.name} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Badge variant="outline" className={`font-normal ${b.badgeClass}`}>
                        {b.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{b.count}</TableCell>
                    <TableCell className="text-right">{b.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(b.cost)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(b.value)}</TableCell>
                    <TableCell className="text-right font-medium">{b.pct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Doughnut Chart */}
          <div className="flex flex-col items-center justify-center p-2 bg-muted/20 rounded-xl border">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">% Value Distribution</h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-xs font-semibold text-muted-foreground">Inventory Cost vs. Selling Value by Age Bucket</h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(val) => `₹${val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="Cost" fill="#64748b" radius={[4, 4, 0, 0]} name="Total Cost" />
                <Bar dataKey="Value" fill="#10b981" radius={[4, 4, 0, 0]} name="Selling Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
