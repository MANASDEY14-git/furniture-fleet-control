
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

  const content = (
    <>
      {recordingPayment && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-800/30 rounded-lg">
            <p className="text-blue-200"><strong>Order:</strong> {recordingPayment.order_number}</p>
            <p className="text-blue-200"><strong>Customer:</strong> {recordingPayment.customer_name || 'Walk-in'}</p>
            <p className="text-blue-200"><strong>Balance Due:</strong> <span className="text-orange-400 font-bold">{formatCurrency(recordingPayment.balance_due)}</span></p>
          </div>
          
          <div className="space-y-2">
            <label className="text-blue-200 font-semibold">Payment Amount</label>
            <Input
              type="number"
              step="0.01"
              max={recordingPayment.balance_due}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100"
              placeholder="Enter payment amount"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-blue-200 font-semibold">Description</label>
            <Textarea
              value={paymentDescription}
              onChange={(e) => setPaymentDescription(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100 resize-none"
              placeholder="Enter payment description (optional)"
              rows={3}
            />
          </div>
          
          <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'justify-end'}`}>
            <Button
              variant="outline"
              onClick={() => setRecordingPayment(null)}
              className={`border-blue-500/30 text-blue-200 ${isMobile ? 'w-full' : ''}`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={!paymentAmount || isRecordingPayment}
              className={`cyber-button text-white ${isMobile ? 'w-full' : ''}`}
            >
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
        <DrawerContent className="futuristic-card">
          <DrawerHeader>
            <DrawerTitle className="text-cyan-300">Record Payment</DrawerTitle>
            <DrawerDescription className="text-blue-300">
              Record a payment for this sales order to update the balance due.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={!!recordingPayment} onOpenChange={() => setRecordingPayment(null)}>
      <DialogContent className="futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300">Record Payment</DialogTitle>
          <DialogDescription className="text-blue-300">
            Record a payment for this sales order to update the balance due.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
