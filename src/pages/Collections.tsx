import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Phone, IndianRupee, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import { useReceivablesAging, type ReceivableRow } from '@/hooks/useCollections';
import { useStoreContext } from '@/contexts/StoreContext';
import { useNavigate } from 'react-router-dom';

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

export default function Collections() {
  const { activeStoreId } = useStoreContext();
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useReceivablesAging();
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
      <div className="p-6">
        <Card><CardContent className="p-8 text-center text-muted-foreground">Pick a single store to see its collections.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
          <p className="text-sm text-muted-foreground">Who owes you, how old it is, and who to call first. Cancelled orders are excluded.</p>
        </div>
        <Button variant="outline" onClick={download} disabled={!visible.length}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3 w-3" /> Total outstanding</p>
            <p className="text-xl font-semibold mt-1">{formatCurrency(totals.outstanding)}</p>
          </CardContent>
        </Card>
        {[
          { label: '0-30 days', value: totals.b0 },
          { label: '31-60 days', value: totals.b31 },
          { label: '61-90 days', value: totals.b61 },
          { label: '90+ days', value: totals.b90 },
        ].map((c) => (
          <Card key={c.label} className="rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {c.label}</p>
              <p className="text-xl font-semibold mt-1">{formatCurrency(c.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {totals.overLimit > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          {totals.overLimit} customer{totals.overLimit > 1 ? 's are' : ' is'} over the credit limit set on their profile.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((b) => (
          <Button
            key={b.key}
            size="sm"
            variant={bucket === b.key ? 'default' : 'outline'}
            onClick={() => setBucket(b.key)}
            title={b.hint}
          >
            {b.label}
          </Button>
        ))}
        <Input
          placeholder="Search customer or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {BUCKETS.find((b) => b.key === bucket)?.label} · {visible.length} customer{visible.length === 1 ? '' : 's'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{BUCKETS.find((b) => b.key === bucket)?.hint}</p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading receivables…</p>
          ) : !visible.length ? (
            <p className="p-6 text-sm text-muted-foreground">Nothing pending in this bucket. Good place to be.</p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {visible.map((r) => (
                  <div key={r.customer_id ?? r.customer_name} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{r.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{r.open_orders} open · oldest {r.oldest_age_days}d ({formatDate(r.oldest_unpaid_date)})</p>
                      </div>
                      <p className="font-semibold">{formatCurrency(Number(r.outstanding || 0))}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {Number(r.bucket_90_plus) > 0 && <Badge variant="destructive">90+ {formatCurrency(Number(r.bucket_90_plus))}</Badge>}
                      {Number(r.bucket_61_90) > 0 && <Badge variant="outline">61-90 {formatCurrency(Number(r.bucket_61_90))}</Badge>}
                      {Number(r.bucket_31_60) > 0 && <Badge variant="outline">31-60 {formatCurrency(Number(r.bucket_31_60))}</Badge>}
                      {Number(r.bucket_0_30) > 0 && <Badge variant="secondary">0-30 {formatCurrency(Number(r.bucket_0_30))}</Badge>}
                    </div>
                    {r.last_note && <p className="text-xs text-muted-foreground">Last note: {r.last_note}</p>}
                    <div className="flex gap-2">
                      {r.customer_phone && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`tel:${r.customer_phone}`}><Phone className="h-3.5 w-3.5 mr-1" /> Call</a>
                        </Button>
                      )}
                      {r.customer_id && (
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/customers/${r.customer_id}`)}>Profile</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
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
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((r) => {
                      const overLimit = Number(r.credit_limit || 0) > 0 && Number(r.outstanding || 0) > Number(r.credit_limit);
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
                          <TableCell className="text-xs">{formatDate(r.oldest_unpaid_date)}<br /><span className="text-muted-foreground">{r.oldest_age_days}d</span></TableCell>
                          <TableCell className="text-xs max-w-[200px]">
                            {r.last_followup_at ? formatDate(r.last_followup_at) : 'Never'}
                            {r.last_note && <p className="text-muted-foreground truncate">{r.last_note}</p>}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {r.customer_phone && (
                              <Button size="sm" variant="outline" asChild className="mr-1">
                                <a href={`tel:${r.customer_phone}`}><Phone className="h-3.5 w-3.5" /></a>
                              </Button>
                            )}
                            {r.customer_id && (
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/customers/${r.customer_id}`)}>Open</Button>
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
}
