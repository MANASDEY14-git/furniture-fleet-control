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
import { 
  Banknote, 
  Smartphone, 
  Building2, 
  CreditCard, 
  Wallet2,
  FileText,
  DollarSign
} from 'lucide-react';

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
    store_id: '',
    supplier_id: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'cash' as PaymentMethod,
    bank_account_id: '',
    transaction_reference: '',
    upi_id: '',
    card_last_four: '',
    payment_gateway: '',
    cheque_number: '',
    cheque_date: '',
    bank_charges: '',
    payment_status: 'completed' as 'pending' | 'completed' | 'failed' | 'cancelled',
    notes: '',
  });

  const netAmount = formData.amount && formData.bank_charges 
    ? Number(formData.amount) - Number(formData.bank_charges)
    : formData.amount ? Number(formData.amount) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const paymentData: any = {
      type: formData.type,
      store_id: formData.store_id,
      amount: Number(formData.amount),
      date: formData.date,
      payment_method: formData.payment_method,
      payment_status: formData.payment_status,
    };

    if (formData.supplier_id) paymentData.supplier_id = formData.supplier_id;
    if (formData.description) paymentData.description = formData.description;
    if (formData.notes) paymentData.notes = formData.notes;

    // Non-cash payment fields
    if (formData.payment_method !== 'cash') {
      if (formData.bank_account_id) paymentData.bank_account_id = formData.bank_account_id;
      if (formData.bank_charges) paymentData.bank_charges = Number(formData.bank_charges);
      if (formData.transaction_reference) paymentData.transaction_reference = formData.transaction_reference;
    }

    // UPI specific
    if (formData.payment_method === 'upi') {
      if (formData.upi_id) paymentData.upi_id = formData.upi_id;
      if (formData.payment_gateway) paymentData.payment_gateway = formData.payment_gateway;
    }

    // Card specific
    if (formData.payment_method === 'debit_card' || formData.payment_method === 'credit_card') {
      if (formData.card_last_four) paymentData.card_last_four = formData.card_last_four;
    }

    // Cheque specific
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
      type: 'Receipt',
      store_id: '',
      supplier_id: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      payment_method: 'cash',
      bank_account_id: '',
      transaction_reference: '',
      upi_id: '',
      card_last_four: '',
      payment_gateway: '',
      cheque_number: '',
      cheque_date: '',
      bank_charges: '',
      payment_status: 'completed',
      notes: '',
    });
  };

  const renderPaymentMethodFields = () => {
    const method = formData.payment_method;

    if (method === 'cash') return null;

    return (
      <div className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-cyan-500/20">
        <h3 className="text-sm font-semibold text-cyan-300">Payment Details</h3>

        {/* Bank Account (all non-cash) */}
        <div>
          <Label className="text-blue-200">Bank Account</Label>
          <BankAccountSelector
            value={formData.bank_account_id}
            onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
            storeId={formData.store_id}
          />
        </div>

        {/* UPI Fields */}
        {method === 'upi' && (
          <>
            <div>
              <Label className="text-blue-200">UPI ID</Label>
              <Input
                placeholder="customer@paytm"
                value={formData.upi_id}
                onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                className="neon-border bg-slate-800/50 text-blue-100"
              />
            </div>
            <div>
              <Label className="text-blue-200">Payment Gateway</Label>
              <Select value={formData.payment_gateway} onValueChange={(value) => setFormData({ ...formData, payment_gateway: value })}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select gateway" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-cyan-500/30">
                  {upiGateways.map((gateway) => (
                    <SelectItem key={gateway} value={gateway} className="text-blue-100 focus:bg-cyan-900/20">
                      {gateway}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Card Fields */}
        {(method === 'debit_card' || method === 'credit_card') && (
          <div>
            <Label className="text-blue-200">Last 4 Digits</Label>
            <Input
              placeholder="1234"
              maxLength={4}
              value={formData.card_last_four}
              onChange={(e) => setFormData({ ...formData, card_last_four: e.target.value.replace(/\D/g, '') })}
              className="neon-border bg-slate-800/50 text-blue-100"
            />
          </div>
        )}

        {/* Cheque Fields */}
        {method === 'cheque' && (
          <>
            <div>
              <Label className="text-blue-200">Cheque Number</Label>
              <Input
                placeholder="123456"
                value={formData.cheque_number}
                onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })}
                className="neon-border bg-slate-800/50 text-blue-100"
              />
            </div>
            <div>
              <Label className="text-blue-200">Cheque Date</Label>
              <Input
                type="date"
                value={formData.cheque_date}
                onChange={(e) => setFormData({ ...formData, cheque_date: e.target.value })}
                className="neon-border bg-slate-800/50 text-blue-100"
              />
            </div>
            <div>
              <Label className="text-blue-200">Status</Label>
              <Select value={formData.payment_status} onValueChange={(value: any) => setFormData({ ...formData, payment_status: value })}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-cyan-500/30">
                  <SelectItem value="pending" className="text-blue-100 focus:bg-cyan-900/20">Pending Clearance</SelectItem>
                  <SelectItem value="completed" className="text-blue-100 focus:bg-cyan-900/20">Cleared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Transaction Reference (all except cash) */}
        <div>
          <Label className="text-blue-200">Transaction Reference / ID</Label>
          <Input
            placeholder="TXN123456789"
            value={formData.transaction_reference}
            onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
            className="neon-border bg-slate-800/50 text-blue-100"
          />
        </div>

        {/* Bank Charges */}
        <div>
          <Label className="text-blue-200">Bank/Transaction Charges</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.bank_charges}
            onChange={(e) => setFormData({ ...formData, bank_charges: e.target.value })}
            className="neon-border bg-slate-800/50 text-blue-100"
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="futuristic-card max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">Add Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Transaction Type */}
            <div>
              <Label className="text-blue-200">Type *</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-cyan-500/30">
                  <SelectItem value="Receipt" className="text-blue-100 focus:bg-cyan-900/20">Receipt (Money In)</SelectItem>
                  <SelectItem value="Payment" className="text-blue-100 focus:bg-cyan-900/20">Payment (Money Out)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div>
              <Label className="text-blue-200">Amount *</Label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="neon-border bg-slate-800/50 text-blue-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <Label className="text-blue-200">Date *</Label>
              <Input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="neon-border bg-slate-800/50 text-blue-100"
              />
            </div>

            {/* Store */}
            <div>
              <Label className="text-blue-200">Store *</Label>
              <Select value={formData.store_id} onValueChange={(value) => setFormData({ ...formData, store_id: value })} required>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-cyan-500/30">
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-cyan-900/20">
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <Label className="text-blue-200">Payment Method *</Label>
            <Select value={formData.payment_method} onValueChange={(value: PaymentMethod) => setFormData({ ...formData, payment_method: value })}>
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-cyan-500/30">
                {paymentMethodOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value} className="text-blue-100 focus:bg-cyan-900/20">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-cyan-400" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Payment Method Fields */}
          {renderPaymentMethodFields()}

          {/* Supplier (optional) */}
          {formData.type === 'Payment' && (
            <div>
              <Label className="text-blue-200">Supplier (optional)</Label>
              <Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-cyan-500/30">
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="text-blue-100 focus:bg-cyan-900/20">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div>
            <Label className="text-blue-200">Description</Label>
            <Input
              placeholder="Payment for order #123..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="neon-border bg-slate-800/50 text-blue-100"
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-blue-200">Additional Notes</Label>
            <Textarea
              placeholder="Any additional information..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="neon-border bg-slate-800/50 text-blue-100 min-h-[60px]"
            />
          </div>

          {/* Net Amount Display */}
          {formData.payment_method !== 'cash' && formData.bank_charges && (
            <div className="p-4 bg-cyan-900/20 rounded-lg border border-cyan-500/30">
              <div className="flex justify-between items-center">
                <span className="text-blue-200">Net Amount:</span>
                <span className="text-xl font-bold text-cyan-300">{formatCurrency(netAmount)}</span>
              </div>
              <p className="text-xs text-blue-300 mt-1">
                Amount ({formatCurrency(Number(formData.amount))}) - Charges ({formatCurrency(Number(formData.bank_charges))})
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-cyan-500/30 text-blue-200 hover:bg-cyan-900/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPayment.isPending}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {createPayment.isPending ? 'Saving...' : 'Save Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
