import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStores } from '@/hooks/useStores';
import { useCreatePayment } from '@/hooks/usePayments';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface QuickPaymentDialogProps {
  supplier: any;
  trigger: React.ReactNode;
}

export default function QuickPaymentDialog({ supplier, trigger }: QuickPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [storeId, setStoreId] = useState('');
  const [description, setDescription] = useState('');
  const [referenceType, setReferenceType] = useState('bank_transfer');

  const { data: stores = [] } = useStores();
  const createPayment = useCreatePayment();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !storeId || !date) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await createPayment.mutateAsync({
        amount: parseFloat(amount),
        type: 'Payment',
        supplier_id: supplier.id,
        store_id: storeId,
        date: format(date, 'yyyy-MM-dd'),
        description: description || `Payment to ${supplier.name}`,
        // reference_type: referenceType, // Remove this line as it's not in the Payment interface
      });

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      // Reset form
      setAmount('');
      setDescription('');
      setReferenceType('bank_transfer');
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">
            Record Payment - {supplier.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-blue-200">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="Enter payment amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="text-blue-200">Payment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal neon-border bg-slate-800/50 text-blue-100",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store" className="text-blue-200">Store *</Label>
            <Select value={storeId} onValueChange={setStoreId} required>
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/30">
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-blue-800/30">
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceType" className="text-blue-200">Payment Method</Label>
            <Select value={referenceType} onValueChange={setReferenceType}>
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/30">
                <SelectItem value="bank_transfer" className="text-blue-100 focus:bg-blue-800/30">
                  Bank Transfer
                </SelectItem>
                <SelectItem value="cash" className="text-blue-100 focus:bg-blue-800/30">
                  Cash
                </SelectItem>
                <SelectItem value="cheque" className="text-blue-100 focus:bg-blue-800/30">
                  Cheque
                </SelectItem>
                <SelectItem value="upi" className="text-blue-100 focus:bg-blue-800/30">
                  UPI
                </SelectItem>
                <SelectItem value="card" className="text-blue-100 focus:bg-blue-800/30">
                  Card
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-blue-200">Description</Label>
            <Textarea
              id="description"
              placeholder="Payment description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 neon-border bg-slate-800/50 text-blue-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPayment.isPending}
              className="flex-1 cyber-button text-white"
            >
              {createPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}