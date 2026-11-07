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
import {
  Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, PhoneCall, Truck, FileClock, IndianRupee, CheckCircle2, BellOff, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/currencyUtils';
import { useFollowupWorklist, useLogFollowup, type FollowupRow, type FollowupKind } from '@/hooks/useFollowupWorklist';
import { useStoreContext } from '@/contexts/StoreContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import PaymentRecordDialog, { type PaymentMethodDetails } from '@/components/sales/PaymentRecordDialog';
import { useRecordPayment } from '@/hooks/useSalePaymentStatus';

const KIND_META: Record<FollowupKind, { label: string; icon: any; hint: string; emptyReason: string }> = {
  collection: {
    label: 'Money to collect',
    icon: IndianRupee,
    hint: 'Orders with a balance still pending',
    emptyReason: 'No order in this store has a pending balance right now.',
  },
  paid_undelivered: {
    label: 'Paid, not delivered',
    icon: Truck,
    hint: 'Customer has paid in full and is still waiting',
    emptyReason: 'Every fully paid order has already been marked delivered.',
  },
  delivery_slipping: {
    label: 'Delivery promise slipping',
    icon: PhoneCall,
    hint: 'Promised delivery date is already past',
    emptyReason: 'No undelivered order has a promised date in the past. Orders without a promised date cannot appear here.',
  },
  quote_cold: {
    label: 'Quotes going cold',
    icon: FileClock,
    hint: 'Draft or sent quotes with no movement for 3+ days',
    emptyReason: 'No open quotes in this store — every document here was created as an order.',
  },
};

const bucketLabel = (bucket?: string | null) => {
  switch (bucket) {
    case '0-7': return '0-7 days';
    case '8-30': return '8-30 days';
    case '30+': return '30+ days';
    default: return bucket || '';
  }
};

const bucketTone = (bucket?: string | null) => {
  switch (bucket) {
    case '30+': return 'bg-destructive/10 text-destructive border-destructive/20';
    case '8-30': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-IN') : '';

function FollowupCard({
  row,
  onLog,
  onRecordPayment,
}: {
  row: FollowupRow;
  onLog: (row: FollowupRow) => void;
  onRecordPayment?: (row: FollowupRow) => void;
}) {
  const cleanPhone = (row.customer_phone || '').replace(/\D/g, '');
  const waNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const waMessage = encodeURIComponent(
    `Hello ${row.customer_name || 'Customer'}, reminder for payment of ${formatCurrency(
      row.balance_due || 0
    )} towards order #${row.order_number}. Kindly arrange payment. Thank you!`
  );

  return (
    <div className={`rounded-2xl border bg-card p-4 shadow-sm space-y-3 ${row.snoozed ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">
            {row.customer_name || 'Walk-in customer'}
          </p>
          <p className="text-xs text-muted-foreground">
            #{row.order_number} • {formatDate(row.order_date)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {row.age_bucket && (
            <Badge variant="outline" className={bucketTone(row.age_bucket)}>
              {bucketLabel(row.age_bucket)}
            </Badge>
          )}
          {row.snoozed && (
            <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
              <BellOff className="mr-1 h-3 w-3" /> Snoozed to {formatDate(row.snooze_until)}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center p-2 bg-muted/40 rounded-xl">
        <div>
          <p className="text-[11px] text-muted-foreground">Order</p>
          <p className="text-sm font-semibold text-foreground truncate">{formatCurrency(row.total_amount || 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Collected</p>
          <p className="text-sm font-semibold text-green-600 truncate">{formatCurrency(row.collected || 0)}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Pending</p>
          <p className="text-sm font-semibold text-amber-600 truncate">{formatCurrency(row.balance_due || 0)}</p>
        </div>
      </div>

      {(row.last_note || row.last_followup_at || row.next_action_date) && (
        <div className="rounded-lg bg-muted p-2 space-y-1">
          {row.last_note && (
            <p className="text-xs text-foreground italic">"{row.last_note}"</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            {row.last_followup_at
              ? `Last contacted ${formatDate(row.last_followup_at)}${row.last_followup_by ? ` by ${row.last_followup_by}` : ''}`
              : 'Never contacted'}
            {row.next_action_date ? ` • Call back ${formatDate(row.next_action_date)}` : ''}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {row.customer_phone && (
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <a href={`tel:${row.customer_phone}`}>
              <Phone className="mr-1 h-3.5 w-3.5" /> Call
            </a>
          </Button>
        )}

        {cleanPhone && (row.balance_due || 0) > 0 && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <a href={`https://wa.me/${waNumber}?text=${waMessage}`} target="_blank" rel="noopener noreferrer">
              <MessageSquare className="mr-1 h-3.5 w-3.5" /> WhatsApp
            </a>
          </Button>
        )}

        {onRecordPayment && (row.balance_due || 0) > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            onClick={() => onRecordPayment(row)}
          >
            <IndianRupee className="mr-1 h-3 w-3" /> Collect
          </Button>
        )}

        <Button size="sm" onClick={() => onLog(row)} className="h-8 text-xs">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Log
        </Button>

        {row.customer_id && (
          <Button asChild variant="ghost" size="sm" className="h-8 text-xs ml-auto">
            <Link to={`/customers/${row.customer_id}`}>Profile</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DailyWorklist({
  hideHeader = false
}: {
  hideHeader?: boolean;
}) {
  const isMobile = useIsMobile();
  const { activeStoreId } = useStoreContext();
  const { data: rows = [], isLoading, refetch } = useFollowupWorklist();
  const logFollowup = useLogFollowup();
  const recordPayment = useRecordPayment();

  const [active, setActive] = useState<FollowupRow | null>(null);
  const [outcome, setOutcome] = useState('called');
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [snoozeDate, setSnoozeDate] = useState('');

  // Payment Recording State
  const [recordingPayment, setRecordingPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');

  const grouped = useMemo(() => {
    const base: Record<FollowupKind, FollowupRow[]> = {
      collection: [], paid_undelivered: [], delivery_slipping: [], quote_cold: [],
    };
    rows.forEach((r) => {
      if (base[r.kind]) base[r.kind].push(r);
    });
    // Snoozed rows stay visible but sink to the bottom of their bucket.
    (Object.keys(base) as FollowupKind[]).forEach((k) => {
      base[k].sort((a, b) => {
        if (a.snoozed !== b.snoozed) return a.snoozed ? 1 : -1;
        return Number(b.priority || 0) - Number(a.priority || 0);
      });
    });
    return base;
  }, [rows]);

  const activeCount = (kind: FollowupKind) => grouped[kind].filter(r => !r.snoozed).length;
  const totalPending = grouped.collection
    .filter(r => !r.snoozed)
    .reduce((s, r) => s + Number(r.balance_due || 0), 0);

  const submit = () => {
    if (!active) return;
    logFollowup.mutate(
      {
        orderId: active.order_id,
        kind: active.kind,
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

  const handleStartPayment = (row: FollowupRow) => {
    setRecordingPayment({
      sale_id: row.order_id,
      order_id: row.order_id,
      order_number: row.order_number,
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      total_price: row.total_amount,
      total_paid: row.collected,
      balance_due: row.balance_due,
      store_id: activeStoreId,
    });
    setPaymentAmount((row.balance_due || 0).toString());
    setPaymentDescription(`Collection follow-up payment for order #${row.order_number}`);
  };

  const handleRecordOrderPayment = async (details: PaymentMethodDetails) => {
    if (!recordingPayment || !paymentAmount) return;

    const description = paymentDescription.trim() || `Payment for order #${recordingPayment.order_number}`;

    await recordPayment.mutateAsync({
      sale_id: recordingPayment.sale_id || recordingPayment.order_id,
      amount: parseFloat(paymentAmount),
      date: new Date().toISOString().split('T')[0],
      description,
      store_id: recordingPayment.store_id || activeStoreId,
      order_description: recordingPayment.order_number,
      ...details,
    });

    setRecordingPayment(null);
    setPaymentAmount('');
    setPaymentDescription('');
    refetch();
  };

  if (!activeStoreId || activeStoreId === 'all') {
    return (
      <div className="p-4 sm:p-6">
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Select a single store to see today's follow-up list.
        </CardContent></Card>
      </div>
    );
  }

  const logFollowupFormContent = (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs">Outcome</Label>
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
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
        <Label className="text-xs">Note</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did the customer say?"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Call back on</Label>
          <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="h-10 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Snooze until</Label>
          <Input type="date" value={snoozeDate} onChange={(e) => setSnoozeDate(e.target.value)} className="h-10 text-xs" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Snoozed items stay on the list with a badge and sink to the bottom — nothing is hidden.
      </p>
    </div>
  );

  const content = (
    <div className="space-y-5">
      {!hideHeader && (
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Today's Follow-ups</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            The short list of customers to call today. Cancelled orders are never shown here.
          </p>
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {(Object.keys(KIND_META) as FollowupKind[]).map((kind) => {
          const Icon = KIND_META[kind].icon;
          return (
            <Card key={kind} className="shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs truncate">{KIND_META[kind].label}</span>
                </div>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-foreground">{activeCount(kind)}</p>
                {kind === 'collection' && (
                  <p className="text-[11px] text-amber-600 font-medium truncate">{formatCurrency(totalPending)} pending</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tab list with horizontal scroll on mobile */}
      <Tabs defaultValue="collection" className="space-y-4">
        <div className="overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full justify-start h-auto p-1 gap-1">
            {(Object.keys(KIND_META) as FollowupKind[]).map((kind) => (
              <TabsTrigger
                key={kind}
                value={kind}
                className="text-xs sm:text-sm whitespace-nowrap py-1.5 px-3 rounded-lg"
              >
                {KIND_META[kind].label} ({activeCount(kind)})
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {(Object.keys(KIND_META) as FollowupKind[]).map((kind) => (
          <TabsContent key={kind} value={kind} className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 border-b">
                <CardTitle className="text-base sm:text-lg">{KIND_META[kind].label}</CardTitle>
                <p className="text-xs text-muted-foreground">{KIND_META[kind].hint}</p>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {isLoading ? (
                  <p className="text-sm text-center py-6 text-muted-foreground">Loading worklist...</p>
                ) : grouped[kind].length === 0 ? (
                  <div className="py-8 text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">Nothing pending here.</p>
                    <p className="text-xs text-muted-foreground">{KIND_META[kind].emptyReason}</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {grouped[kind].map((row) => (
                      <FollowupCard
                        key={`${row.kind}-${row.order_id}`}
                        row={row}
                        onLog={setActive}
                        onRecordPayment={handleStartPayment}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Payment Record Dialog */}
      <PaymentRecordDialog
        recordingPayment={recordingPayment}
        setRecordingPayment={setRecordingPayment}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentDescription={paymentDescription}
        setPaymentDescription={setPaymentDescription}
        handleRecordPayment={handleRecordOrderPayment}
        isRecordingPayment={recordPayment.isPending}
      />

      {/* Log Follow-up: Drawer on Mobile, Dialog on Desktop */}
      {isMobile ? (
        <Drawer open={!!active} onOpenChange={(open) => !open && setActive(null)}>
          <DrawerContent className="max-h-[90vh] flex flex-col">
            <DrawerHeader className="text-left pb-2">
              <DrawerTitle>Log follow-up — #{active?.order_number}</DrawerTitle>
              <DrawerDescription className="text-xs">
                Record interaction outcome with {active?.customer_name || 'customer'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pt-1 overflow-y-auto flex-1 overscroll-contain">
              {logFollowupFormContent}
            </div>
            <DrawerFooter className="p-4 pt-2 border-t bg-background shrink-0 flex flex-col gap-2">
              <Button onClick={submit} disabled={logFollowup.isPending} className="w-full h-11 text-base font-semibold">
                {logFollowup.isPending ? 'Saving...' : 'Save Follow-up'}
              </Button>
              <Button variant="outline" onClick={() => setActive(null)} className="w-full h-10">
                Close
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log follow-up — #{active?.order_number}</DialogTitle>
            </DialogHeader>
            {logFollowupFormContent}
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
              <Button onClick={submit} disabled={logFollowup.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={async () => { await refetch(); }}>
        <div className="p-3 sm:p-4">{content}</div>
      </PullToRefresh>
    );
  }

  return <div className="p-4 md:p-6 lg:p-8">{content}</div>;
}
