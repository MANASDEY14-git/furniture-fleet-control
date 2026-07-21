import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreatePayment, PaymentMethod } from '@/hooks/usePayments';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import BankAccountSelector from './BankAccountSelector';
import { formatCurrency } from '@/utils/currencyUtils';
import { Banknote, Smartphone, Building2, CreditCard, Wallet2, FileText, DollarSign } from 'lucide-react';

interface PaymentEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentMethodOptions: { value: PaymentMethod; label: string; icon: any }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'upi', label: 'UPI', icon: Smartphone },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'cheque', label: 'Cheque', icon: FileText },
  { value: 'online_wallet', label: 'Online Wallet', icon: Wallet2 },
  { value: 'other', label: 'Other', icon: DollarSign },
];

const upiGateways = ['PhonePe', 'Google Pay', 'Paytm', 'BHIM', 'Amazon Pay', 'Other'];

export default function PaymentEntryForm({ open, onOpenChange }: PaymentEntryFormProps) {
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const createPayment = useCreatePayment();

  const [formData, setFormData] = useState({
    type: 'Receipt' as 'Payment' | 'Receipt',
    store_id: '', supplier_id: '', amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '', payment_method: 'cash' as PaymentMethod,
    bank_account_id: '', transaction_reference: '',
    upi_id: '', card_last_four: '', payment_gateway: '',
    cheque_number: '', cheque_date: '', bank_charges: '',
    payment_status: 'completed' as 'pending' | 'completed' | 'failed' | 'cancelled',
    notes: '',
  });

  const netAmount = formData.amount && formData.bank_charges 
    ? Number(formData.amount) - Number(formData.bank_charges)
    : formData.amount ? Number(formData.amount) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentData: any = {
      type: formData.type, store_id: formData.store_id,
      amount: Number(formData.amount), date: formData.date,
      payment_method: formData.payment_method, payment_status: formData.payment_status,
    };
    if (formData.supplier_id) paymentData.supplier_id = formData.supplier_id;
    if (formData.description) paymentData.description = formData.description;
    if (formData.notes) paymentData.notes = formData.notes;
    if (formData.payment_method !== 'cash') {
      if (formData.bank_account_id) paymentData.bank_account_id = formData.bank_account_id;
      if (formData.bank_charges) paymentData.bank_charges = Number(formData.bank_charges);
      if (formData.transaction_reference) paymentData.transaction_reference = formData.transaction_reference;
    }
    if (formData.payment_method === 'upi') {
      if (formData.upi_id) paymentData.upi_id = formData.upi_id;
      if (formData.payment_gateway) paymentData.payment_gateway = formData.payment_gateway;
    }
    if (formData.payment_method === 'debit_card' || formData.payment_method === 'credit_card') {
      if (formData.card_last_four) paymentData.card_last_four = formData.card_last_four;
    }
    if (formData.payment_method === 'cheque') {
      if (formData.cheque_number) paymentData.cheque_number = formData.cheque_number;
      if (formData.cheque_date) paymentData.cheque_date = formData.cheque_date;
    }
    await createPayment.mutateAsync(paymentData);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      type: 'Receipt', store_id: '', supplier_id: '', amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '', payment_method: 'cash', bank_account_id: '',
      transaction_reference: '', upi_id: '', card_last_four: '',
      payment_gateway: '', cheque_number: '', cheque_date: '',
      bank_charges: '', payment_status: 'completed', notes: '',
    });
  };

  const renderPaymentMethodFields = () => {
    const method = formData.payment_method;
    if (method === 'cash') return null;

    return (
      <div className="space-y-4 p-4 bg-muted rounded-lg">
        <h3 className="text-sm font-semibold text-foreground">Payment Details</h3>
        <div>
          <Label>Bank Account</Label>
          <BankAccountSelector value={formData.bank_account_id} onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })} storeId={formData.store_id} />
        </div>
        {method === 'upi' && (
          <>
            <div><Label>UPI ID</Label><Input placeholder="customer@paytm" value={formData.upi_id} onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })} /></div>
            <div><Label>Payment Gateway</Label>
              <Select value={formData.payment_gateway} onValueChange={(value) => setFormData({ ...formData, payment_gateway: value })}>
                <SelectTrigger><SelectValue placeholder="Select gateway" /></SelectTrigger>
                <SelectContent>{upiGateways.map((gateway) => (<SelectItem key={gateway} value={gateway}>{gateway}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </>
        )}
        {(method === 'debit_card' || method === 'credit_card') && (
          <div><Label>Last 4 Digits</Label><Input placeholder="1234" maxLength={4} value={formData.card_last_four} onChange={(e) => setFormData({ ...formData, card_last_four: e.target.value.replace(/\D/g, '') })} /></div>
        )}
        {method === 'cheque' && (
          <>
            <div><Label>Cheque Number</Label><Input placeholder="123456" value={formData.cheque_number} onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })} /></div>
            <div><Label>Cheque Date</Label><Input type="date" value={formData.cheque_date} onChange={(e) => setFormData({ ...formData, cheque_date: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={formData.payment_status} onValueChange={(value: any) => setFormData({ ...formData, payment_status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Clearance</SelectItem>
                  <SelectItem value="completed">Cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        <div><Label>Transaction Reference / ID</Label><Input placeholder="TXN123456789" value={formData.transaction_reference} onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })} /></div>
        <div><Label>Bank/Transaction Charges</Label><Input type="number" step="0.01" placeholder="0.00" value={formData.bank_charges} onChange={(e) => setFormData({ ...formData, bank_charges: e.target.value })} /></div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Type *</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Receipt">Receipt (Money In)</SelectItem>
                  <SelectItem value="Payment">Payment (Money Out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount *</Label><Input type="number" step="0.01" required placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Date *</Label><Input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
            <div><Label>Store *</Label>
              <Select value={formData.store_id} onValueChange={(value) => setFormData({ ...formData, store_id: value })} required>
                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                <SelectContent>{stores.map((store) => (<SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Payment Method *</Label>
            <Select value={formData.payment_method} onValueChange={(value: PaymentMethod) => setFormData({ ...formData, payment_method: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.map((option) => {
                  const Icon = option.icon;
                  return (<SelectItem key={option.value} value={option.value}><div className="flex items-center gap-2"><Icon className="w-4 h-4 text-muted-foreground" /><span>{option.label}</span></div></SelectItem>);
                })}
              </SelectContent>
            </Select>
          </div>
          {renderPaymentMethodFields()}
          {formData.type === 'Payment' && (
            <div><Label>Supplier (optional)</Label>
              <Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>{suppliers.map((supplier) => (<SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Description</Label><Input placeholder="Payment for order #123..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
          <div><Label>Additional Notes</Label><Textarea placeholder="Any additional information..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="min-h-[60px]" /></div>
          {formData.payment_method !== 'cash' && formData.bank_charges && (
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-foreground">Net Amount:</span>
                <span className="text-xl font-bold text-foreground">{formatCurrency(netAmount)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Amount ({formatCurrency(Number(formData.amount))}) - Charges ({formatCurrency(Number(formData.bank_charges))})
              </p>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={createPayment.isPending} className="flex-1">
              {createPayment.isPending ? 'Saving...' : 'Save Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
