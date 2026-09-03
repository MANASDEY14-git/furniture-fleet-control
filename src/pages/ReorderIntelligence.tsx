import React, { Fragment, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Snowflake,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Layers,
  ShieldCheck,
  TrendingDown,
  Calendar,
  Building2,
  Package
} from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import { useReorderIntelligence, type ReorderRow } from '@/hooks/useReorderIntelligence';
import { useStoreContext } from '@/contexts/StoreContext';

const BUCKETS = {
  reorder_now: {
    label: 'Reorder now',
    icon: AlertTriangle,
    badgeVariant: 'destructive' as const,
    hint: 'Net stock cannot cover expected demand through supplier lead time',
  },
  reorder_soon: {
    label: 'Reorder soon',
    icon: Clock,
    badgeVariant: 'default' as const,
    hint: 'Net stock runs out within ~2 supplier lead time windows',
  },
  sell_through: {
    label: 'Sell through',
    icon: CheckCircle2,
    badgeVariant: 'outline' as const,
    hint: 'Stock covers well past the horizon — no order needed',
  },
  dead_stock: {
    label: 'Dead stock',
    icon: Snowflake,
    badgeVariant: 'secondary' as const,
    hint: 'Stock on hand with no sale in 180+ days — capital sitting idle',
  },
  never_sold: {
    label: 'Never sold',
    icon: HelpCircle,
    badgeVariant: 'secondary' as const,
    hint: 'Stock bought but never sold — needs clearance or promotion',
  },
} as const;

type BucketKey = keyof typeof BUCKETS;

const toCsv = (rows: ReorderRow[]) => {
  const header = [
    'Item Name',
    'Category',
    'Supplier',
    'Demand Class',
    'Confidence',
    'Rate Basis',
    'Est Monthly Demand',
    'Cat Monthly Rate',
    'Units Sold 30d',
    'Units Sold 90d',
    'Units Sold 365d',
    'Orders 30d',
    'Orders 90d',
    'Orders 365d',
    'Selling Months',
    'Avg Units/Order',
    'First Sale Date',
    'Last Sale Date',
    'Days Since Last Sale',
    'Current Stock',
    'Open Demand',
    'Net Stock',
    'Cost Price',
    'Selling Price',
    'Stock Value',
    'Supplier Lead Days',
    'Last Purchase Date',
    'Days Held',
    'Decision',
    'Lead Time Demand',
    'Cover Days',
    'Suggested Qty',
    'Suggested Order Cost',
    'Evidence Sentence',
  ];

  const body = rows.map((r) => [
    r.item_name,
    r.category_name ?? '',
    r.supplier_name ?? '',
    r.demand_class,
    r.confidence,
    r.demand_rate_basis,
    r.estimated_monthly_demand,
    r.category_monthly_rate,
    r.units_sold_30d,
    r.units_sold_90d,
    r.units_sold_365d,
    r.orders_count_30d,
    r.orders_count_90d,
    r.orders_count_365d,
    r.selling_months_count,
    r.avg_units_per_order,
    r.first_sale_date ?? '',
    r.last_sale_date ?? '',
    r.days_since_last_sale ?? '',
    r.current_stock,
    r.open_demand,
    r.net_stock,
    r.cost_price,
    r.selling_price,
    r.stock_value,
    r.supplier_lead_days,
    r.last_purchase_date ?? '',
    r.days_held,
    r.decision,
    r.lead_time_demand,
    r.cover_days ?? '',
    r.suggested_qty,
    r.suggested_order_cost,
    r.evidence_sentence,
  ]);

  return [header, ...body]
    .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
};

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  if (confidence === 'high') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
        High conf.
      </span>
    );
  }
  if (confidence === 'medium') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        Medium conf.
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
      Low conf.
    </span>
  );
}

function DemandClassBadge({ demandClass }: { demandClass: string }) {
  const map: Record<string, { label: string; class: string }> = {
    steady: {
      label: 'Steady',
      class: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    intermittent: {
      label: 'Intermittent',
      class: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    one_off: {
      label: 'One-off',
      class: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    },
    no_history: {
      label: 'No history',
      class: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border-stone-200 dark:border-stone-700',
    },
  };
  const config = map[demandClass] || { label: demandClass, class: 'bg-muted text-muted-foreground' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.class}`}>
      {config.label}
    </span>
  );
}

export default function ReorderIntelligence({ hideHeader = false }: { hideHeader?: boolean }) {
  const { activeStoreId } = useStoreContext();
  const [windowDays, setWindowDays] = useState('365');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [showLowConfidence, setShowLowConfidence] = useState(false);

  const { data: rows = [], isLoading } = useReorderIntelligence(Number(windowDays));

  const toggleRow = (itemId: string) => {
    setExpandedRows((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.item_name.toLowerCase().includes(q) ||
        (r.category_name && r.category_name.toLowerCase().includes(q)) ||
        (r.supplier_name && r.supplier_name.toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const grouped = useMemo(() => {
    const base: Record<BucketKey, ReorderRow[]> = {
      reorder_now: [],
      reorder_soon: [],
      sell_through: [],
      dead_stock: [],
      never_sold: [],
    };
    filteredRows.forEach((r) => {
      const key = (r.decision as BucketKey) in base ? (r.decision as BucketKey) : null;
      if (key) base[key].push(r);
    });
    return base;
  }, [filteredRows]);

  const bySupplierReorderNow = useMemo(() => {
    const map = new Map<string, { name: string; leadDays: number; rows: ReorderRow[]; value: number }>();
    grouped.reorder_now.forEach((r) => {
      const key = r.supplier_id || 'unassigned';
      const entry = map.get(key) || {
        name: r.supplier_name || 'No supplier set',
        leadDays: r.supplier_lead_days || 21,
        rows: [],
        value: 0,
      };
      entry.rows.push(r);
      entry.value += Number(r.suggested_order_cost || 0);
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [grouped.reorder_now]);

  // Overall KPI sums from all unfiltered rows
  const reorderNowValue = useMemo(() => {
    return rows
      .filter((r) => r.decision === 'reorder_now')
      .reduce((s, r) => s + Number(r.suggested_order_cost || 0), 0);
  }, [rows]);

  const deadValue = useMemo(() => {
    return rows
      .filter((r) => r.decision === 'dead_stock')
      .reduce((s, r) => s + Number(r.stock_value || 0), 0);
  }, [rows]);

  const neverSoldValue = useMemo(() => {
    return rows
      .filter((r) => r.decision === 'never_sold')
      .reduce((s, r) => s + Number(r.stock_value || 0), 0);
  }, [rows]);

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
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-8 text-center text-muted-foreground">
            Select a single store to see factual reorder intelligence.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {!hideHeader ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Reorder & Dead Stock
              </h1>
              <Badge variant="outline" className="text-xs bg-muted/50">
                Factual Engine
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Decisions grounded in real order history, actual delivery commitments, and verified supplier cadence. No fake velocities.
            </p>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search items, category..."
              className="pl-8 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={windowDays} onValueChange={setWindowDays}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 180 days</SelectItem>
              <SelectItem value="365">Last 365 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Urgent Reorders</p>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {rows.filter((r) => r.decision === 'reorder_now').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ≈ {formatCurrency(reorderNowValue)} order value
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Reorder Soon</p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {rows.filter((r) => r.decision === 'reorder_soon').length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Covers ~1-2 lead times</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Dead Stock</p>
              <Snowflake className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {rows.filter((r) => r.decision === 'dead_stock').length}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
              {formatCurrency(deadValue)} locked (180d+ idle)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Never Sold</p>
              <HelpCircle className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {rows.filter((r) => r.decision === 'never_sold').length}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
              {formatCurrency(neverSoldValue)} locked in stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="reorder_now" className="space-y-4">
        <TabsList className="flex w-full flex-wrap h-auto bg-muted/40 p-1 border border-border/40">
          {(Object.keys(BUCKETS) as BucketKey[]).map((k) => (
            <TabsTrigger key={k} value={k} className="text-xs md:text-sm py-1.5 px-3">
              {BUCKETS[k].label} ({grouped[k].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(BUCKETS) as BucketKey[]).map((bucketKey) => {
          const bucketRows = grouped[bucketKey];
          const actionableRows = bucketRows.filter((r) => r.confidence !== 'low');
          const lowConfidenceRows = bucketRows.filter((r) => r.confidence === 'low');

          return (
            <TabsContent key={bucketKey} value={bucketKey} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{BUCKETS[bucketKey].hint}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download(bucketRows, `reorder-${bucketKey}`)}
                    className="h-8 text-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Export {BUCKETS[bucketKey].label}
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Calculating factual inventory and replenishment evidence...
                </div>
              ) : bucketRows.length === 0 ? (
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No items match this bucket.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Actionable items table (High & Medium confidence) */}
                  <Card className="border-border/60 shadow-sm overflow-hidden">
                    <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          Actionable Items ({actionableRows.length})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Repeat demand with verified transaction history
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                      {actionableRows.length === 0 ? (
                        <p className="py-6 text-center text-xs text-muted-foreground">
                          No items with high or medium confidence in this bucket.
                        </p>
                      ) : (
                        <ReorderTable
                          rows={actionableRows}
                          bucketKey={bucketKey}
                          expandedRows={expandedRows}
                          toggleRow={toggleRow}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Collapsible Low Confidence Section */}
                  {lowConfidenceRows.length > 0 && (
                    <Card className="border-border/60 shadow-sm overflow-hidden bg-muted/10">
                      <div
                        className="py-3 px-4 flex items-center justify-between cursor-pointer select-none hover:bg-muted/20 transition-colors"
                        onClick={() => setShowLowConfidence(!showLowConfidence)}
                      >
                        <div className="flex items-center gap-2">
                          {showLowConfidence ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-xs font-semibold text-foreground">
                            Not Enough History ({lowConfidenceRows.length} items)
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            — single orders or category benchmark fallback. Review manually before ordering.
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {showLowConfidence ? 'Hide' : 'Review'}
                        </Badge>
                      </div>

                      {showLowConfidence && (
                        <CardContent className="p-0 border-t border-border/40 overflow-x-auto">
                          <ReorderTable
                            rows={lowConfidenceRows}
                            bucketKey={bucketKey}
                            expandedRows={expandedRows}
                            toggleRow={toggleRow}
                          />
                        </CardContent>
                      )}
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function ReorderTable({
  rows,
  bucketKey,
  expandedRows,
  toggleRow,
}: {
  rows: ReorderRow[];
  bucketKey: BucketKey;
  expandedRows: Record<string, boolean>;
  toggleRow: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/40 hover:bg-transparent">
          <TableHead className="w-8"></TableHead>
          <TableHead className="text-xs font-semibold">Item</TableHead>
          <TableHead className="text-xs font-semibold">Demand Class</TableHead>
          <TableHead className="text-xs font-semibold text-right">Sold 30d / 90d / 365d</TableHead>
          <TableHead className="text-xs font-semibold text-right">Last Sale</TableHead>
          <TableHead className="text-xs font-semibold text-right">Stock (Reserved)</TableHead>
          <TableHead className="text-xs font-semibold text-right">Cover / Cadence</TableHead>
          <TableHead className="text-xs font-semibold text-right">Suggested Qty</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const isExpanded = !!expandedRows[r.item_id];
          return (
            <Fragment key={r.item_id}>
              <TableRow
                className={`border-border/40 cursor-pointer hover:bg-muted/30 transition-colors ${
                  isExpanded ? 'bg-muted/20' : ''
                }`}
                onClick={() => toggleRow(r.item_id)}
              >
                <TableCell className="py-2.5 pl-3 pr-0 text-muted-foreground">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </TableCell>
                <TableCell className="py-2.5">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground leading-snug">{r.item_name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{r.category_name || 'Uncategorized'}</span>
                      <span>•</span>
                      <span>{r.supplier_name || 'No supplier'}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2.5">
                  <div className="flex flex-col gap-1 items-start">
                    <DemandClassBadge demandClass={r.demand_class} />
                    <ConfidenceBadge confidence={r.confidence} />
                  </div>
                </TableCell>
                <TableCell className="py-2.5 text-right font-mono text-xs">
                  <div>
                    <span className="font-semibold text-foreground">{r.units_sold_30d}</span> /{' '}
                    <span>{r.units_sold_90d}</span> / <span>{r.units_sold_365d}</span> pcs
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    ({r.orders_count_365d} ord in {r.selling_months_count} mos)
                  </div>
                </TableCell>
                <TableCell className="py-2.5 text-right text-xs">
                  {r.days_since_last_sale !== null ? (
                    <div>
                      <span className="font-medium text-foreground">{r.days_since_last_sale}d ago</span>
                      <div className="text-[11px] text-muted-foreground">{r.last_sale_date}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Never sold</span>
                  )}
                </TableCell>
                <TableCell className="py-2.5 text-right text-xs font-mono">
                  <span className="font-semibold text-foreground">{r.current_stock}</span>
                  {r.open_demand > 0 && (
                    <span className="text-red-500 font-semibold text-[11px] ml-1">
                      (-{r.open_demand})
                    </span>
                  )}
                  <div className="text-[11px] text-muted-foreground">
                    Val: {formatCurrency(r.stock_value)}
                  </div>
                </TableCell>
                <TableCell className="py-2.5 text-right text-xs">
                  <div className="font-mono">
                    {r.cover_days !== null ? (
                      <span className={r.cover_days < r.supplier_lead_days ? 'text-red-500 font-bold' : ''}>
                        {Math.round(r.cover_days)}d cover
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Supplier: ~{r.supplier_lead_days}d
                  </div>
                </TableCell>
                <TableCell className="py-2.5 text-right text-xs font-mono">
                  {r.suggested_qty > 0 ? (
                    <div>
                      <span className="font-bold text-sm text-foreground">{r.suggested_qty} pcs</span>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatCurrency(r.suggested_order_cost)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>

              {/* Facts Panel row expansion */}
              {isExpanded && (
                <TableRow className="bg-muted/10 border-border/40 hover:bg-muted/10">
                  <TableCell colSpan={8} className="p-4 md:p-6">
                    <div className="space-y-4 max-w-5xl">
                      {/* Evidence sentence banner */}
                      <div className="p-3 rounded-lg border border-border/60 bg-background/80 flex items-start gap-2.5">
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Evidence & Recommendation
                          </p>
                          <p className="text-sm text-foreground/90 font-medium leading-relaxed">
                            {r.evidence_sentence}
                          </p>
                        </div>
                      </div>

                      {/* Fact grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {/* Demand facts */}
                        <div className="p-3 rounded border border-border/40 bg-background space-y-2">
                          <div className="flex items-center gap-1.5 font-semibold text-foreground border-b pb-1.5">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            <span>Demand Facts</span>
                          </div>
                          <div className="space-y-1 font-mono text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sold 30d / 90d / 365d:</span>
                              <span className="font-semibold">{r.units_sold_30d} / {r.units_sold_90d} / {r.units_sold_365d} pcs</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Orders 30d / 90d / 365d:</span>
                              <span>{r.orders_count_30d} / {r.orders_count_90d} / {r.orders_count_365d} ord</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Selling Months (Year):</span>
                              <span>{r.selling_months_count} mos</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg Units / Order:</span>
                              <span>{r.avg_units_per_order} pcs</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">First Sale Date:</span>
                              <span>{r.first_sale_date || 'None'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Sale Date:</span>
                              <span>{r.last_sale_date || 'None'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Model & Confidence */}
                        <div className="p-3 rounded border border-border/40 bg-background space-y-2">
                          <div className="flex items-center gap-1.5 font-semibold text-foreground border-b pb-1.5">
                            <TrendingDown className="h-3.5 w-3.5 text-primary" />
                            <span>Demand Model</span>
                          </div>
                          <div className="space-y-1 font-mono text-[11px]">
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Class:</span>
                              <DemandClassBadge demandClass={r.demand_class} />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Confidence:</span>
                              <ConfidenceBadge confidence={r.confidence} />
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rate Basis:</span>
                              <span className="capitalize">{r.demand_rate_basis}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Est Monthly Demand:</span>
                              <span className="font-semibold">{r.estimated_monthly_demand} pcs/mo</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Category Benchmark:</span>
                              <span>{r.category_monthly_rate} pcs/mo</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Lead Time Demand:</span>
                              <span>{r.lead_time_demand} pcs</span>
                            </div>
                          </div>
                        </div>

                        {/* Replenishment facts */}
                        <div className="p-3 rounded border border-border/40 bg-background space-y-2">
                          <div className="flex items-center gap-1.5 font-semibold text-foreground border-b pb-1.5">
                            <Package className="h-3.5 w-3.5 text-primary" />
                            <span>Replenishment Facts</span>
                          </div>
                          <div className="space-y-1 font-mono text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Physical On-Hand:</span>
                              <span className="font-semibold">{r.current_stock} pcs</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Reserved (Undelivered):</span>
                              <span className={r.open_demand > 0 ? 'text-red-500 font-semibold' : ''}>
                                {r.open_demand} pcs
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Net Stock:</span>
                              <span className="font-semibold">{r.net_stock} pcs</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cost / Sell Price:</span>
                              <span>{formatCurrency(r.cost_price)} / {formatCurrency(r.selling_price)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Supplier Median Cadence:</span>
                              <span>~{r.supplier_lead_days} days</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Purchase Date:</span>
                              <span>{r.last_purchase_date || 'None recorded'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Days Held:</span>
                              <span>{r.days_held} days</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
