import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { formatCurrency } from '@/utils/currencyUtils';
import { useIsMobile } from '@/hooks/use-mobile';
interface PaymentRecordDialogProps {
  recordingPayment: any;
  setRecordingPayment: (payment: any) => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  paymentDescription: string;
  setPaymentDescription: (description: string) => void;
  handleRecordPayment: () => void;
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
            <label className="text-foreground font-semibold">Description</label>
            <Textarea value={paymentDescription} onChange={e => setPaymentDescription(e.target.value)} className="resize-none" placeholder="Enter payment description (optional)" rows={3} />
          </div>
          
          <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'justify-end'}`}>
            <Button variant="outline" onClick={() => setRecordingPayment(null)} className={isMobile ? 'w-full' : ''}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={!paymentAmount || isRecordingPayment} className="">
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
          <div className="p-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>;
  }
  return <Dialog open={!!recordingPayment} onOpenChange={() => setRecordingPayment(null)}>
      <DialogContent>
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
