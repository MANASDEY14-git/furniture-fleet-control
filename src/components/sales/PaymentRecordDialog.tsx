import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BankAccountSelector from '@/components/BankAccountSelector';
import { formatCurrency } from '@/utils/currencyUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export type PaymentMethodOption = 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'debit_card' | 'credit_card';

export interface PaymentMethodDetails {
  payment_method: PaymentMethodOption;
  bank_account_id?: string;
  transaction_reference?: string;
  cheque_number?: string;
  cheque_date?: string;
}

const PAYMENT_METHODS: { value: PaymentMethodOption; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'credit_card', label: 'Credit Card' },
];

interface PaymentRecordDialogProps {
  recordingPayment: any;
  setRecordingPayment: (payment: any) => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  paymentDescription: string;
  setPaymentDescription: (description: string) => void;
  handleRecordPayment: (details: PaymentMethodDetails) => void;
  isRecordingPayment: boolean;
}

export default function PaymentRecordDialog({
  recordingPayment,
  setRecordingPayment,
  paymentAmount,
  setPaymentAmount,
  paymentDescription,
  setPaymentDescription,
  handleRecordPayment,
  isRecordingPayment,
}: PaymentRecordDialogProps) {
  const isMobile = useIsMobile();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>('cash');
  const [bankAccountId, setBankAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  // Calculations for order amounts
  const currentDue = Math.max(0, Math.round((Number(recordingPayment?.balance_due) || 0) * 100) / 100);
  const totalAmount = Number(recordingPayment?.total_price || recordingPayment?.total_amount || 0);
  const alreadyPaid = Number(recordingPayment?.total_paid || recordingPayment?.advance_paid || 0);

  const numAmount = parseFloat(paymentAmount) || 0;
  const isOverpaid = numAmount > currentDue + 0.001;
  const isFullyPaid = currentDue <= 0;
  const newDueAfterPayment = Math.max(0, Math.round((currentDue - numAmount) * 100) / 100);

  // Reset method fields and pre-fill amount with current due whenever a new order is opened
  useEffect(() => {
    if (recordingPayment) {
      setPaymentMethod('cash');
      setBankAccountId('');
      setReference('');
      setChequeNumber('');
      setChequeDate('');
      const due = Math.max(0, Math.round((Number(recordingPayment?.balance_due) || 0) * 100) / 100);
      setPaymentAmount(due > 0 ? due.toString() : '');
    }
  }, [recordingPayment?.sale_id || recordingPayment?.id]);

  const isNonCash = paymentMethod !== 'cash';
  const canSubmit =
    !isRecordingPayment &&
    !isFullyPaid &&
    numAmount > 0 &&
    !isOverpaid &&
    (!isNonCash || !!bankAccountId);

  const onSubmit = () => {
    if (!canSubmit) return;
    handleRecordPayment({
      payment_method: paymentMethod,
      bank_account_id: isNonCash && bankAccountId ? bankAccountId : undefined,
      transaction_reference: reference.trim() || undefined,
      cheque_number: paymentMethod === 'cheque' && chequeNumber.trim() ? chequeNumber.trim() : undefined,
      cheque_date: paymentMethod === 'cheque' && chequeDate ? chequeDate : undefined,
    });
  };

  const content = (
    <>
      {recordingPayment && (
        <div className="space-y-4">
          {/* Order Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/60 border rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Order Total</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalAmount)}</p>
              <p className="text-xs text-muted-foreground truncate">{recordingPayment.order_number}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Already Paid</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(alreadyPaid)}</p>
              <p className="text-xs text-muted-foreground truncate">{recordingPayment.customer_name || 'Walk-in'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Current Balance Due</p>
              <p className={`text-lg font-bold ${isFullyPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {formatCurrency(currentDue)}
              </p>
              <span
                className={`inline-block text-[11px] px-1.5 py-0.5 rounded font-medium ${
                  isFullyPaid
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {isFullyPaid ? 'Fully Settled' : 'Payment Due'}
              </span>
            </div>
          </div>

          {/* If already fully paid */}
          {isFullyPaid ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">Order is fully settled</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  The remaining balance for order {recordingPayment.order_number} is ₹0. No further collection is needed.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-foreground font-semibold flex items-center gap-1.5">
                  Payment Amount
                  <span className="text-xs font-normal text-muted-foreground">(Max: {formatCurrency(currentDue)})</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  onClick={() => setPaymentAmount(currentDue.toString())}
                >
                  Pay Full Due ({formatCurrency(currentDue)})
                </Button>
              </div>

              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={currentDue}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder={`Enter payment amount (max ${formatCurrency(currentDue)})`}
                className={isOverpaid ? 'border-destructive focus-visible:ring-destructive' : ''}
              />

              {/* Overpayment Error Warning */}
              {isOverpaid && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-center justify-between gap-2 text-destructive text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Cannot exceed remaining due of {formatCurrency(currentDue)}. (Exceeds by {formatCurrency(numAmount - currentDue)})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:bg-destructive/20 underline shrink-0"
                    onClick={() => setPaymentAmount(currentDue.toString())}
                  >
                    Set to {formatCurrency(currentDue)}
                  </Button>
                </div>
              )}

              {/* Live Remaining Balance Projection */}
              {!isOverpaid && numAmount > 0 && (
                <div
                  className={`p-2.5 rounded-md text-xs font-medium flex items-center justify-between ${
                    newDueAfterPayment === 0
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {newDueAfterPayment === 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    )}
                    {newDueAfterPayment === 0 ? 'Full settlement:' : 'Partial payment:'}
                  </span>
                  <span>
                    New Due will be: <strong>{formatCurrency(newDueAfterPayment)}</strong>
                  </span>
                </div>
              )}

              {/* Quick partial shortcuts */}
              {currentDue > 5000 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground self-center mr-1">Quick:</span>
                  {[5000, 10000, 20000, 25000, 50000]
                    .filter((chip) => chip < currentDue)
                    .map((chip) => (
                      <Button
                        key={chip}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs bg-muted/70 hover:bg-muted"
                        onClick={() => setPaymentAmount(chip.toString())}
                      >
                        ₹{(chip / 1000).toLocaleString()}k
                      </Button>
                    ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs bg-muted/70 hover:bg-muted"
                    onClick={() => setPaymentAmount(currentDue.toString())}
                  >
                    Full Due ({formatCurrency(currentDue)})
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-foreground font-semibold">Payment Method</label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => {
                setPaymentMethod(v as PaymentMethodOption);
                if (v === 'cash') {
                  setBankAccountId('');
                  setChequeNumber('');
                  setChequeDate('');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isNonCash && (
            <>
              <div className="space-y-2">
                <label className="text-foreground font-semibold">Bank Account</label>
                <BankAccountSelector
                  value={bankAccountId}
                  onValueChange={setBankAccountId}
                  storeId={recordingPayment.store_id}
                />
                {!bankAccountId && (
                  <p className="text-xs text-muted-foreground">Required for non-cash payments so the amount hits the right account.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-foreground font-semibold">Reference / Txn No. (optional)</label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI ref, NEFT no., card txn id..." />
              </div>
            </>
          )}

          {paymentMethod === 'cheque' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-foreground font-semibold">Cheque No.</label>
                <Input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} placeholder="Cheque number" />
              </div>
              <div className="space-y-2">
                <label className="text-foreground font-semibold">Cheque Date</label>
                <Input type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-foreground font-semibold">Description</label>
            <Textarea
              value={paymentDescription}
              onChange={(e) => setPaymentDescription(e.target.value)}
              className="resize-none"
              placeholder="Enter payment description (optional)"
              rows={3}
            />
          </div>

          <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'justify-end'}`}>
            <Button variant="outline" onClick={() => setRecordingPayment(null)} className={isMobile ? 'w-full' : ''}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!canSubmit} className="">
              {isRecordingPayment ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={!!recordingPayment} onOpenChange={() => setRecordingPayment(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Record Payment</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Record a payment for this sales order to update the balance due.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={!!recordingPayment} onOpenChange={() => setRecordingPayment(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Record Payment</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Record a payment for this sales order to update the balance due.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
