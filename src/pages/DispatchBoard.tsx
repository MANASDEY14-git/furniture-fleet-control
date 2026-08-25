import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Truck, AlertTriangle, CalendarClock, CalendarDays, HelpCircle, Phone, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/currencyUtils';
import { useDispatchBoard, useDeliveryPerformance, type DispatchRow, type DispatchBucket } from '@/hooks/useDispatchBoard';
import { useStoreContext } from '@/contexts/StoreContext';

const COLUMNS: { key: DispatchBucket; label: string; hint: string; icon: typeof Truck; tone: string }[] = [
  { key: 'overdue', label: 'Overdue', hint: 'Promise date has passed', icon: AlertTriangle, tone: 'text-red-600' },
  { key: 'today', label: 'Due today', hint: 'Load these on the van', icon: Truck, tone: 'text-emerald-600' },
  { key: 'this_week', label: 'Next 7 days', hint: 'Prepare stock and route', icon: CalendarClock, tone: 'text-blue-600' },
  { key: 'unscheduled', label: 'No promise date', hint: 'Call the customer and commit a date', icon: HelpCircle, tone: 'text-amber-600' },
  { key: 'later', label: 'Later', hint: 'Scheduled beyond a week', icon: CalendarDays, tone: 'text-muted-foreground' },
];

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Not set';

function OrderCard({ row, onDeliver }: { row: DispatchRow; onDeliver: (row: DispatchRow) => void }) {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{row.customer_name}</p>
          <p className="text-[11px] text-muted-foreground">#{row.order_number} · {row.items_count} item{row.items_count === 1 ? '' : 's'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{formatCurrency(Number(row.total_amount || 0))}</p>
          {Number(row.balance_due || 0) > 0 && (
            <p className="text-[11px] text-red-600">{formatCurrency(Number(row.balance_due))} due</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        <Badge variant="outline">Promise {formatDate(row.delivery_date)}</Badge>
        {row.days_overdue > 0 && <Badge variant="destructive">{row.days_overdue}d late</Badge>}
        {row.delivery_status && <Badge variant="secondary">{row.delivery_status}</Badge>}
      </div>
      {row.customer_address && <p className="text-[11px] text-muted-foreground line-clamp-2">{row.customer_address}</p>}
      <div className="flex gap-2">
        {row.customer_phone && (
          <Button size="sm" variant="outline" asChild className="h-7 px-2">
            <a href={`tel:${row.customer_phone}`}><Phone className="h-3 w-3 mr-1" /> Call</a>
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => onDeliver(row)}>
          <Check className="h-3 w-3 mr-1" /> Delivered
        </Button>
      </div>
    </div>
  );
}

export default function DispatchBoard() {
  const { activeStoreId } = useStoreContext();
  const { data: rows = [], isLoading } = useDispatchBoard();
  const { data: performance = [] } = useDeliveryPerformance(6);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deliverRow, setDeliverRow] = useState<DispatchRow | null>(null);
  const [delayReason, setDelayReason] = useState('');

  const markDelivered = useMutation({
    mutationFn: async ({ row, reason }: { row: DispatchRow; reason: string }) => {
      const { error } = await supabase
        .from('sales_orders')
        .update({
          delivery_status: 'Delivered',
          delivered_at: new Date().toISOString(),
          delivery_delay_reason: reason.trim() || null,
        })
        .eq('id', row.order_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch-board'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-performance'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['followup-worklist'] });
      toast({ title: 'Marked delivered', description: 'The dispatch board has been updated.' });
      setDeliverRow(null);
      setDelayReason('');
    },
    onError: (e: Error) =>
      toast({ title: 'Could not update order', description: e.message, variant: 'destructive' }),
  });

  const isLate = (deliverRow?.days_overdue ?? 0) > 0;


  const grouped = useMemo(() => {
    const base: Record<DispatchBucket, DispatchRow[]> = { overdue: [], today: [], this_week: [], later: [], unscheduled: [] };
    rows.forEach((r) => { if (base[r.bucket]) base[r.bucket].push(r); });
    base.overdue.sort((a, b) => b.days_overdue - a.days_overdue);
    return base;
  }, [rows]);

  const thisMonth = performance[0];

  if (!activeStoreId || activeStoreId === 'all') {
    return (
      <div className="p-6">
        <Card><CardContent className="p-8 text-center text-muted-foreground">Pick a single store to see its dispatch board.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dispatch board</h1>
        <p className="text-sm text-muted-foreground">Every order still to go out, grouped by the date you promised the customer.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending deliveries</p>
            <p className="text-xl font-semibold mt-1">{rows.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-xl font-semibold mt-1 text-red-600">{grouped.overdue.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Money tied up in pending orders</p>
            <p className="text-xl font-semibold mt-1">{formatCurrency(rows.reduce((s, r) => s + Number(r.total_amount || 0), 0))}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">On-time rate this month</p>
            <p className="text-xl font-semibold mt-1">{thisMonth?.on_time_rate != null ? `${thisMonth.on_time_rate}%` : '—'}</p>
            {thisMonth && (
              <p className="text-[11px] text-muted-foreground">{thisMonth.on_time_count}/{thisMonth.delivered_count} on time · avg delay {thisMonth.avg_delay_days ?? 0}d</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading dispatch board…</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const Icon = col.icon;
            const list = grouped[col.key];
            return (
              <Card key={col.key} className="rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${col.tone}`} /> {col.label}
                    <Badge variant="secondary" className="ml-auto">{list.length}</Badge>
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">{col.hint}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!list.length ? (
                    <p className="text-xs text-muted-foreground">Nothing here.</p>
                  ) : (
                    list.map((r) => <OrderCard key={r.order_id} row={r} />)
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {performance.length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Delivery discipline, last 6 months</CardTitle>
            <p className="text-xs text-muted-foreground">On time means delivered on or before the promised date.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {performance.map((p) => (
              <div key={p.month} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                <span>{new Date(p.month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                <span className="text-muted-foreground">{p.delivered_count} delivered · {p.late_count} late</span>
                <span className="font-semibold">{p.on_time_rate != null ? `${p.on_time_rate}%` : '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
