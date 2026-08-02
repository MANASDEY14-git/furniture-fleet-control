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
  isRecordingPayment
}: PaymentRecordDialogProps) {
  const isMobile = useIsMobile();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>('cash');
  const [bankAccountId, setBankAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');

  // Reset method fields whenever a new order is opened
  useEffect(() => {
    if (recordingPayment) {
      setPaymentMethod('cash');
      setBankAccountId('');
      setReference('');
      setChequeNumber('');
      setChequeDate('');
    }
  }, [recordingPayment?.sale_id]);

  const isNonCash = paymentMethod !== 'cash';
  const canSubmit = !!paymentAmount && !isRecordingPayment && (!isNonCash || !!bankAccountId);

  const onSubmit = () => {
    handleRecordPayment({
      payment_method: paymentMethod,
      bank_account_id: isNonCash && bankAccountId ? bankAccountId : undefined,
      transaction_reference: reference.trim() || undefined,
      cheque_number: paymentMethod === 'cheque' && chequeNumber.trim() ? chequeNumber.trim() : undefined,
      cheque_date: paymentMethod === 'cheque' && chequeDate ? chequeDate : undefined,
    });
  };

  const content = <>
      {recordingPayment && <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-foreground"><strong>Order:</strong> {recordingPayment.order_number}</p>
            <p className="text-foreground"><strong>Customer:</strong> {recordingPayment.customer_name || 'Walk-in'}</p>
            <p className="text-foreground"><strong>Balance Due:</strong> <span className="text-amber-600 font-bold">{formatCurrency(recordingPayment.balance_due)}</span></p>
          </div>
          
          <div className="space-y-2">
            <label className="text-foreground font-semibold">Payment Amount</label>
            <Input type="number" step="0.01" max={recordingPayment.balance_due} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Enter payment amount" />
          </div>

          <div className="space-y-2">
            <label className="text-foreground font-semibold">Payment Method</label>
            <Select value={paymentMethod} onValueChange={(v) => {
              setPaymentMethod(v as PaymentMethodOption);
              if (v === 'cash') {
                setBankAccountId('');
                setChequeNumber('');
                setChequeDate('');
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isNonCash && <>
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
              <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="UPI ref, NEFT no., card txn id..." />
            </div>
          </>}

          {paymentMethod === 'cheque' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-foreground font-semibold">Cheque No.</label>
                <Input value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} placeholder="Cheque number" />
              </div>
              <div className="space-y-2">
                <label className="text-foreground font-semibold">Cheque Date</label>
                <Input type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} />
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-foreground font-semibold">Description</label>
            <Textarea value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} className="resize-none" placeholder="Enter payment description (optional)" rows={3} />
          </div>
          
          <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'justify-end'}`}>
            <Button variant="outline" onClick={() => setRecordingPayment(null)} className={isMobile ? 'w-full' : ''}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!canSubmit} className="">
              {isRecordingPayment ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </div>}
    </>;
  if (isMobile) {
    return <Drawer open={!!recordingPayment} onOpenChange={() => setRecordingPayment(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Record Payment</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Record a payment for this sales order to update the balance due.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>;
  }
  return <Dialog open={!!recordingPayment} onOpenChange={() => setRecordingPayment(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Record Payment</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Record a payment for this sales order to update the balance due.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>;
}
