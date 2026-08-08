import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, PhoneCall, Truck, FileClock, IndianRupee, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/currencyUtils';
import { useFollowupWorklist, useLogFollowup, type FollowupRow, type FollowupKind } from '@/hooks/useFollowupWorklist';
import { useStoreContext } from '@/contexts/StoreContext';

const KIND_META: Record<FollowupKind, { label: string; icon: any; hint: string }> = {
  collect: { label: 'Money to collect', icon: IndianRupee, hint: 'Delivered or advanced orders with balance pending' },
  paid_not_delivered: { label: 'Paid, not delivered', icon: Truck, hint: 'Customer has paid in full and is still waiting' },
  delivery_slipping: { label: 'Delivery promise slipping', icon: PhoneCall, hint: 'Promised date is today or already past' },
  cold_quote: { label: 'Quotes going cold', icon: FileClock, hint: 'Sent quotes with no movement' },
};

const bucketTone = (bucket?: string | null) => {
  switch (bucket) {
    case '30+ days': return 'bg-destructive/10 text-destructive border-destructive/20';
    case '8-30 days': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

function FollowupCard({ row, onLog }: { row: FollowupRow; onLog: (row: FollowupRow) => void }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">
            {row.customer_name || 'Walk-in customer'}
          </p>
          <p className="text-xs text-muted-foreground">
            #{row.order_number} • {new Date(row.order_date).toLocaleDateString('en-IN')}
          </p>
        </div>
        {row.age_bucket && (
          <Badge variant="outline" className={bucketTone(row.age_bucket)}>
            {row.age_bucket}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[11px] text-muted-foreground">Order</p>
          <p className="text-sm font-semibold text-foreground">{formatCurrency(row.total_amount || 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Collected</p>
          <p className="text-sm font-semibold text-green-600">{formatCurrency(row.collected || 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Pending</p>
          <p className="text-sm font-semibold text-amber-600">{formatCurrency(row.balance_due || 0)}</p>
        </div>
      </div>

      {row.last_note && (
        <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
          Last note: {row.last_note}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {row.customer_phone && (
          <Button asChild variant="outline" size="sm">
            <a href={`tel:${row.customer_phone}`}>
              <Phone className="mr-1 h-3.5 w-3.5" /> Call
            </a>
          </Button>
        )}
        <Button size="sm" onClick={() => onLog(row)}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Log follow-up
        </Button>
        {row.customer_id && (
          <Button asChild variant="ghost" size="sm">
            <Link to={`/customers/${row.customer_id}`}>Customer</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DailyWorklist() {
  const { activeStoreId } = useStoreContext();
  const { data: rows = [], isLoading } = useFollowupWorklist();
  const logFollowup = useLogFollowup();

  const [active, setActive] = useState<FollowupRow | null>(null);
  const [outcome, setOutcome] = useState('called');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [snoozeDate, setSnoozeDate] = useState('');

  const grouped = useMemo(() => {
    const base: Record<FollowupKind, FollowupRow[]> = {
      collect: [], paid_not_delivered: [], delivery_slipping: [], cold_quote: [],
    };
    rows.filter(r => !r.snoozed).forEach((r) => base[r.kind]?.push(r));
    return base;
  }, [rows]);

  const totalPending = grouped.collect.reduce((s, r) => s + Number(r.balance_due || 0), 0);

  const submit = () => {
    if (!active) return;
    logFollowup.mutate(
      {
        orderId: active.order_id,
        outcome,
        note,
        nextActionDate: nextDate || null,
        snoozeUntil: snoozeDate || null,
      },
      {
        onSuccess: () => {
          setActive(null); setNote(''); setNextDate(''); setSnoozeDate(''); setOutcome('called');
        },
      },
    );
  };

  if (!activeStoreId || activeStoreId === 'all') {
    return (
      <div className="p-6">
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Select a single store to see today's follow-up list.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Today's Follow-ups</h1>
        <p className="text-muted-foreground text-sm">
          The short list of customers to call today. Cancelled orders are never shown here.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(KIND_META) as FollowupKind[]).map((kind) => {
          const Icon = KIND_META[kind].icon;
          return (
            <Card key={kind}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{KIND_META[kind].label}</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-foreground">{grouped[kind].length}</p>
                {kind === 'collect' && (
                  <p className="text-xs text-amber-600">{formatCurrency(totalPending)} pending</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="collect" className="space-y-4">
        <TabsList className="flex w-full flex-wrap h-auto">
          {(Object.keys(KIND_META) as FollowupKind[]).map((kind) => (
            <TabsTrigger key={kind} value={kind} className="text-xs md:text-sm">
              {KIND_META[kind].label} ({grouped[kind].length})
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(KIND_META) as FollowupKind[]).map((kind) => (
          <TabsContent key={kind} value={kind} className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{KIND_META[kind].label}</CardTitle>
                <p className="text-xs text-muted-foreground">{KIND_META[kind].hint}</p>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading worklist...</p>
                ) : grouped[kind].length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nothing pending here. Good place to be.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {grouped[kind].map((row) => (
                      <FollowupCard key={`${row.kind}-${row.order_id}`} row={row} onLog={setActive} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log follow-up — #{active?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Outcome</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="called">Called — will pay</SelectItem>
                  <SelectItem value="no_answer">No answer</SelectItem>
                  <SelectItem value="promised_payment">Promised payment</SelectItem>
                  <SelectItem value="visited">Visited store</SelectItem>
                  <SelectItem value="dispute">Dispute / issue raised</SelectItem>
                  <SelectItem value="not_interested">Not interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did the customer say?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Call back on</Label>
                <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Hide until</Label>
                <Input type="date" value={snoozeDate} onChange={(e) => setSnoozeDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
            <Button onClick={submit} disabled={logFollowup.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
