import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, PackageSearch, AlertTriangle, Snowflake } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import { useReorderIntelligence, type ReorderRow } from '@/hooks/useReorderIntelligence';
import { useStoreContext } from '@/contexts/StoreContext';

const BUCKETS = {
  reorder_now: { label: 'Reorder now', icon: AlertTriangle, hint: 'Selling steadily with less than 3 weeks of cover' },
  watch: { label: 'Watch', icon: PackageSearch, hint: '3 to 6 weeks of cover — plan the next order' },
  dead_stock: { label: 'Dead stock', icon: Snowflake, hint: 'No sale in the selected window — money sitting still' },
} as const;

type BucketKey = keyof typeof BUCKETS;

const toCsv = (rows: ReorderRow[]) => {
  const header = ['Item', 'Supplier', 'On hand', 'Units sold', 'Weekly velocity', 'Weeks of cover', 'Suggested qty', 'Stock value', 'Days since sale'];
  const body = rows.map((r) => [
    r.item_name, r.supplier_name ?? '', r.quantity_available, r.units_sold,
    Number(r.weekly_velocity || 0).toFixed(2), r.weeks_of_cover ?? '', r.suggested_qty,
    r.stock_value, r.days_since_sale ?? '',
  ]);
  return [header, ...body].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
};

export default function ReorderIntelligence() {
  const { activeStoreId } = useStoreContext();
  const [windowDays, setWindowDays] = useState('90');
  const { data: rows = [], isLoading } = useReorderIntelligence(Number(windowDays));

  const grouped = useMemo(() => {
    const base: Record<BucketKey, ReorderRow[]> = { reorder_now: [], watch: [], dead_stock: [] };
    rows.forEach((r) => {
      const key = (r.bucket as BucketKey) in base ? (r.bucket as BucketKey) : null;
      if (key) base[key].push(r);
    });
    return base;
  }, [rows]);

  const bySupplier = useMemo(() => {
    const map = new Map<string, { name: string; rows: ReorderRow[]; value: number }>();
    grouped.reorder_now.forEach((r) => {
      const key = r.supplier_id || 'unassigned';
      const entry = map.get(key) || { name: r.supplier_name || 'No supplier set', rows: [], value: 0 };
      entry.rows.push(r);
      entry.value += Number(r.suggested_qty || 0) * Number(r.cost_price || 0);
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [grouped.reorder_now]);

  const deadValue = grouped.dead_stock.reduce((s, r) => s + Number(r.stock_value || 0), 0);
  const reorderValue = bySupplier.reduce((s, g) => s + g.value, 0);

  const download = (rowsToExport: ReorderRow[], name: string) => {
    const blob = new Blob([toCsv(rowsToExport)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activeStoreId || activeStoreId === 'all') {
    return (
      <div className="p-6">
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Select a single store to see reorder intelligence.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Reorder & Dead Stock</h1>
          <p className="text-muted-foreground text-sm">
            What to buy this week, and what to clear out. Based on delivered demand, cancelled orders excluded.
          </p>
        </div>
        <Select value={windowDays} onValueChange={setWindowDays}>
          <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 180 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground">Items to reorder</p>
          <p className="text-2xl font-bold text-foreground">{grouped.reorder_now.length}</p>
          <p className="text-xs text-muted-foreground">≈ {formatCurrency(reorderValue)} of purchases</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground">On the watchlist</p>
          <p className="text-2xl font-bold text-foreground">{grouped.watch.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground">Money in dead stock</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(deadValue)}</p>
          <p className="text-xs text-muted-foreground">{grouped.dead_stock.length} items unsold</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="reorder_now" className="space-y-4">
        <TabsList className="flex w-full flex-wrap h-auto">
          {(Object.keys(BUCKETS) as BucketKey[]).map((k) => (
            <TabsTrigger key={k} value={k} className="text-xs md:text-sm">
              {BUCKETS[k].label} ({grouped[k].length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="reorder_now" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => download(grouped.reorder_now, 'reorder-list')}>
              <Download className="mr-1 h-4 w-4" /> Export list
            </Button>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : bySupplier.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nothing needs reordering right now.
            </CardContent></Card>
          ) : bySupplier.map((group) => (
            <Card key={group.name}>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{group.name}</CardTitle>
                <Badge variant="outline">{formatCurrency(group.value)} suggested</Badge>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">On hand</TableHead>
                      <TableHead className="text-right">Sold / week</TableHead>
                      <TableHead className="text-right">Cover</TableHead>
                      <TableHead className="text-right">Order qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.rows.map((r) => (
                      <TableRow key={r.item_id}>
                        <TableCell className="font-medium">{r.item_name}</TableCell>
                        <TableCell className="text-right">{r.quantity_available}</TableCell>
                        <TableCell className="text-right">{Number(r.weekly_velocity || 0).toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          {r.weeks_of_cover === null ? '—' : `${Number(r.weeks_of_cover).toFixed(1)} wk`}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">{r.suggested_qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {(['watch', 'dead_stock'] as BucketKey[]).map((k) => (
          <TabsContent key={k} value={k} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{BUCKETS[k].hint}</p>
              <Button variant="outline" size="sm" onClick={() => download(grouped[k], k.replace('_', '-'))}>
                <Download className="mr-1 h-4 w-4" /> Export
              </Button>
            </div>
            <Card>
              <CardContent className="overflow-x-auto p-4">
                {grouped[k].length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nothing in this list.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">On hand</TableHead>
                        <TableHead className="text-right">Stock value</TableHead>
                        <TableHead className="text-right">
                          {k === 'dead_stock' ? 'Days since sale' : 'Cover'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped[k].map((r) => (
                        <TableRow key={r.item_id}>
                          <TableCell className="font-medium">{r.item_name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.supplier_name || '—'}</TableCell>
                          <TableCell className="text-right">{r.quantity_available}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.stock_value || 0)}</TableCell>
                          <TableCell className="text-right">
                            {k === 'dead_stock'
                              ? (r.days_since_sale === null ? 'Never sold' : `${r.days_since_sale} d`)
                              : (r.weeks_of_cover === null ? '—' : `${Number(r.weeks_of_cover).toFixed(1)} wk`)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
