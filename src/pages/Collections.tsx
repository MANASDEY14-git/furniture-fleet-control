import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Phone, IndianRupee, AlertTriangle, Clock, Search, X, MessageSquare } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import { useReceivablesAging, type ReceivableRow } from '@/hooks/useCollections';
import { useStoreContext } from '@/contexts/StoreContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';

type BucketKey = 'all' | 'bucket_0_30' | 'bucket_31_60' | 'bucket_61_90' | 'bucket_90_plus';

const BUCKETS: { key: BucketKey; label: string; hint: string }[] = [
  { key: 'all', label: 'All outstanding', hint: 'Everything still to be collected' },
  { key: 'bucket_0_30', label: '0-30 days', hint: 'Fresh — a reminder is usually enough' },
  { key: 'bucket_31_60', label: '31-60 days', hint: 'Slipping — call the customer' },
  { key: 'bucket_61_90', label: '61-90 days', hint: 'Needs a firm commitment date' },
  { key: 'bucket_90_plus', label: '90+ days', hint: 'At risk — escalate' },
];

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const toCsv = (rows: ReceivableRow[]) => {
  const header = ['Customer', 'Phone', 'Open orders', 'Billed', 'Collected', 'Outstanding', '0-30', '31-60', '61-90', '90+', 'Oldest unpaid', 'Oldest age (days)'];
  const body = rows.map((r) => [
    r.customer_name ?? '', r.customer_phone ?? '', r.open_orders, r.total_billed, r.total_collected,
    r.outstanding, r.bucket_0_30, r.bucket_31_60, r.bucket_61_90, r.bucket_90_plus,
    r.oldest_unpaid_date ?? '', r.oldest_age_days,
  ]);
  return [header, ...body].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
};

export default function Collections({
  hideHeader = false
}: {
  hideHeader?: boolean;
}) {
  const isMobile = useIsMobile();
  const { activeStoreId } = useStoreContext();
  const navigate = useNavigate();
  const { data: rows = [], isLoading, refetch } = useReceivablesAging();
  const [bucket, setBucket] = useState<BucketKey>('all');
  const [search, setSearch] = useState('');

  const totals = useMemo(() => {
    const sum = (k: keyof ReceivableRow) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
    return {
      outstanding: sum('outstanding'),
      b0: sum('bucket_0_30'),
      b31: sum('bucket_31_60'),
      b61: sum('bucket_61_90'),
      b90: sum('bucket_90_plus'),
      overLimit: rows.filter((r) => Number(r.credit_limit || 0) > 0 && Number(r.outstanding || 0) > Number(r.credit_limit)).length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => (bucket === 'all' ? Number(r.outstanding || 0) > 0 : Number(r[bucket] || 0) > 0))
      .filter((r) => !q || (r.customer_name || '').toLowerCase().includes(q) || (r.customer_phone || '').includes(q))
      .sort((a, b) => Number(b[bucket === 'all' ? 'outstanding' : bucket] || 0) - Number(a[bucket === 'all' ? 'outstanding' : bucket] || 0));
  }, [rows, bucket, search]);

  const download = () => {
    const blob = new Blob([toCsv(visible)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collections-${bucket}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeStoreId || activeStoreId === 'all') {
    return (
      <div className="p-4 sm:p-6">
        <Card><CardContent className="p-8 text-center text-muted-foreground">Pick a single store to see its collections.</CardContent></Card>
      </div>
    );
  }

  const content = (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {!hideHeader ? (
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Collections & Receivables</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Who owes you, how old it is, and who to call first.</p>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Button
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={download}
          disabled={!visible.length}
          className="self-end sm:self-auto text-xs sm:text-sm"
        >
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" /> Export CSV
        </Button>
      </div>

      {/* Aging Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Hero Card: Total Outstanding */}
        <Card className="col-span-2 lg:col-span-1 rounded-2xl shadow-sm border-amber-500/30 bg-gradient-to-br from-card to-amber-500/5">
          <CardContent className="p-3.5 sm:p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
              <IndianRupee className="h-3.5 w-3.5 text-amber-500" /> Total Outstanding
            </p>
            <p className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
              {formatCurrency(totals.outstanding)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Across all aging buckets</p>
          </CardContent>
        </Card>

        {/* 4 Aging Buckets (2x2 on mobile, 4 in row on desktop) */}
        {[
          { label: '0-30 days', value: totals.b0, color: 'text-foreground' },
          { label: '31-60 days', value: totals.b31, color: 'text-blue-600 dark:text-blue-400' },
          { label: '61-90 days', value: totals.b61, color: 'text-amber-600 dark:text-amber-400' },
          { label: '90+ days', value: totals.b90, color: 'text-red-600 dark:text-red-400' },
        ].map((c) => (
          <Card key={c.label} className="col-span-1 rounded-2xl shadow-sm">
            <CardContent className="p-3.5 sm:p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {c.label}
              </p>
              <p className={`text-lg sm:text-xl font-bold mt-1 ${c.color}`}>
                {formatCurrency(c.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {totals.overLimit > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs sm:text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            {totals.overLimit} customer{totals.overLimit > 1 ? 's are' : ' is'} over their credit limit.
          </span>
        </div>
      )}

      {/* Filters: Horizontal scroll chips on mobile + Search bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {BUCKETS.map((b) => (
            <Button
              key={b.key}
              size="sm"
              variant={bucket === b.key ? 'default' : 'outline'}
              onClick={() => setBucket(b.key)}
              title={b.hint}
              className={`shrink-0 text-xs h-8 px-3 rounded-full transition-all ${
                bucket === b.key ? 'shadow-sm font-semibold' : 'text-muted-foreground'
              }`}
            >
              {b.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 h-10 w-full text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Customers List Card */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">
              {BUCKETS.find((b) => b.key === bucket)?.label} · {visible.length} customer{visible.length === 1 ? '' : 's'}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {visible.reduce((s, r) => s + (r.open_orders || 0), 0)} open order(s)
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{BUCKETS.find((b) => b.key === bucket)?.hint}</p>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-center text-muted-foreground">Loading receivables…</p>
          ) : !visible.length ? (
            <div className="p-8 text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Nothing pending in this bucket.</p>
              <p className="text-xs text-muted-foreground">Good place to be!</p>
            </div>
          ) : (
            <>
              {/* Mobile View: High Density Responsive Cards */}
              <div className="md:hidden divide-y divide-border/60">
                {visible.map((r) => {
                  const overLimit = Number(r.credit_limit || 0) > 0 && Number(r.outstanding || 0) > Number(r.credit_limit);
                  const cleanPhone = (r.customer_phone || '').replace(/\D/g, '');
                  const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                  const waMessage = encodeURIComponent(
                    `Hello ${r.customer_name || 'Customer'}, gentle reminder regarding outstanding payment of ${formatCurrency(
                      Number(r.outstanding || 0)
                    )} for your orders with us. Kindly arrange payment. Thank you!`
                  );

                  return (
                    <div key={r.customer_id ?? r.customer_name} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                      {/* Customer Name & Outstanding Amount */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-foreground text-sm truncate">{r.customer_name || 'Unnamed Customer'}</p>
                            {overLimit && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Over limit
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.customer_phone ? (
                              <a href={`tel:${r.customer_phone}`} className="hover:underline inline-flex items-center gap-1 text-primary">
                                <Phone className="h-3 w-3 inline" /> {r.customer_phone}
                              </a>
                            ) : (
                              'No phone on record'
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(Number(r.outstanding || 0))}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Outstanding</p>
                        </div>
                      </div>

                      {/* Financial Breakdown (Billed, Collected, Open Orders) */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-muted/50 rounded-xl text-center text-xs">
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Billed</p>
                          <p className="font-semibold text-foreground truncate">{formatCurrency(Number(r.total_billed || 0))}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Collected</p>
                          <p className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                            {formatCurrency(Number(r.total_collected || 0))}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Open Orders</p>
                          <p className="font-semibold text-foreground">{r.open_orders}</p>
                        </div>
                      </div>

                      {/* Aging Breakdown Pills */}
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        {Number(r.bucket_90_plus) > 0 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                            90+ d: {formatCurrency(Number(r.bucket_90_plus))}
                          </Badge>
                        )}
                        {Number(r.bucket_61_90) > 0 && (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0.5">
                            61-90 d: {formatCurrency(Number(r.bucket_61_90))}
                          </Badge>
                        )}
                        {Number(r.bucket_31_60) > 0 && (
                          <Badge variant="outline" className="border-blue-500/40 text-blue-600 dark:text-blue-400 text-[10px] px-1.5 py-0.5">
                            31-60 d: {formatCurrency(Number(r.bucket_31_60))}
                          </Badge>
                        )}
                        {Number(r.bucket_0_30) > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            0-30 d: {formatCurrency(Number(r.bucket_0_30))}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          Oldest: {r.oldest_age_days}d ({formatDate(r.oldest_unpaid_date)})
                        </span>
                      </div>

                      {/* Follow-up / Note if any */}
                      {(r.last_note || r.last_followup_at) && (
                        <div className="p-2 bg-muted/40 rounded-lg text-xs space-y-0.5">
                          {r.last_note && <p className="text-foreground italic">"{r.last_note}"</p>}
                          <p className="text-[10px] text-muted-foreground">
                            {r.last_followup_at ? `Follow-up: ${formatDate(r.last_followup_at)}` : ''}
                            {r.next_action_date ? ` • Next call: ${formatDate(r.next_action_date)}` : ''}
                          </p>
                        </div>
                      )}

                      {/* Mobile Actions: Call, WhatsApp, Profile */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {r.customer_phone ? (
                          <Button size="sm" variant="outline" asChild className="h-9 text-xs">
                            <a href={`tel:${r.customer_phone}`} className="flex items-center justify-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-primary" /> Call
                            </a>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled className="h-9 text-xs opacity-50">
                            <Phone className="h-3.5 w-3.5 mr-1" /> Call
                          </Button>
                        )}

                        {cleanPhone ? (
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="h-9 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <a
                              href={`https://wa.me/${waNumber}?text=${waMessage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1"
                            >
                              <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled className="h-9 text-xs opacity-50">
                            <MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp
                          </Button>
                        )}

                        {r.customer_id ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate(`/customers/${r.customer_id}`)}
                            className="h-9 text-xs"
                          >
                            Profile
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" disabled className="h-9 text-xs opacity-50">
                            Profile
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">0-30</TableHead>
                      <TableHead className="text-right">31-60</TableHead>
                      <TableHead className="text-right">61-90</TableHead>
                      <TableHead className="text-right">90+</TableHead>
                      <TableHead>Oldest</TableHead>
                      <TableHead>Last follow-up</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((r) => {
                      const overLimit = Number(r.credit_limit || 0) > 0 && Number(r.outstanding || 0) > Number(r.credit_limit);
                      const cleanPhone = (r.customer_phone || '').replace(/\D/g, '');
                      const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                      const waMessage = encodeURIComponent(
                        `Hello ${r.customer_name || 'Customer'}, gentle reminder regarding outstanding payment of ${formatCurrency(
                          Number(r.outstanding || 0)
                        )} for your orders with us. Kindly arrange payment. Thank you!`
                      );

                      return (
                        <TableRow key={r.customer_id ?? r.customer_name}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{r.customer_name}</span>
                              {overLimit && <Badge variant="destructive" className="text-[10px]">Over limit</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">{r.customer_phone || 'No phone'}</span>
                          </TableCell>
                          <TableCell className="text-right">{r.open_orders}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(r.total_billed || 0))}</TableCell>
                          <TableCell className="text-right text-emerald-600">{formatCurrency(Number(r.total_collected || 0))}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(Number(r.outstanding || 0))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(r.bucket_0_30 || 0))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(r.bucket_31_60 || 0))}</TableCell>
                          <TableCell className="text-right text-amber-600">{formatCurrency(Number(r.bucket_61_90 || 0))}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(Number(r.bucket_90_plus || 0))}</TableCell>
                          <TableCell className="text-xs">
                            {formatDate(r.oldest_unpaid_date)}
                            <br />
                            <span className="text-muted-foreground">{r.oldest_age_days}d</span>
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px]">
                            {r.last_followup_at ? formatDate(r.last_followup_at) : 'Never'}
                            {r.last_note && <p className="text-muted-foreground truncate">{r.last_note}</p>}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap space-x-1">
                            {r.customer_phone && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={`tel:${r.customer_phone}`} title="Call customer">
                                  <Phone className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            )}
                            {cleanPhone && (
                              <Button size="sm" variant="outline" asChild className="text-emerald-600 hover:text-emerald-500">
                                <a
                                  href={`https://wa.me/${waNumber}?text=${waMessage}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Send WhatsApp payment reminder"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            )}
                            {r.customer_id && (
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/customers/${r.customer_id}`)}>
                                Profile
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={async () => { await refetch(); }}>
        <div className="p-3 sm:p-4">{content}</div>
      </PullToRefresh>
    );
  }

  return <div className="p-4 md:p-6">{content}</div>;
}
