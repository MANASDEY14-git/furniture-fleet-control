import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateBankAccount, useUpdateBankAccount, BankAccount } from '@/hooks/useBankAccounts';
import { useStores } from '@/hooks/useStores';

interface BankAccountFormProps {
  trigger: React.ReactNode;
  bankAccount?: BankAccount;
}

export default function BankAccountForm({ trigger, bankAccount }: BankAccountFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    store_id: bankAccount?.store_id || '',
    account_name: bankAccount?.account_name || '',
    account_number: bankAccount?.account_number || '',
    bank_name: bankAccount?.bank_name || '',
    ifsc_code: bankAccount?.ifsc_code || '',
    branch_name: bankAccount?.branch_name || '',
    account_type: bankAccount?.account_type || 'savings',
    opening_balance: bankAccount?.opening_balance || 0,
  });

  const { data: stores = [] } = useStores();
  const createBankAccount = useCreateBankAccount();
  const updateBankAccount = useUpdateBankAccount();

  const isEditing = !!bankAccount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.store_id || !formData.account_name || !formData.account_number || !formData.bank_name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (isEditing) {
        await updateBankAccount.mutateAsync({
          id: bankAccount.id,
          ...formData,
        });
      } else {
        await createBankAccount.mutateAsync(formData);
      }
      setOpen(false);
      if (!isEditing) resetForm();
    } catch (error) {
      console.error('Error saving bank account:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      store_id: '',
      account_name: '',
      account_number: '',
      bank_name: '',
      ifsc_code: '',
      branch_name: '',
      account_type: 'savings',
      opening_balance: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen && !isEditing) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl futuristic-card" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store" className="text-blue-200">Store *</Label>
              <Select 
                value={formData.store_id} 
                onValueChange={value => setFormData({ ...formData, store_id: value })}
              >
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-blue-800/30">
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_type" className="text-blue-200">Account Type *</Label>
              <Select 
                value={formData.account_type} 
                onValueChange={value => setFormData({ ...formData, account_type: value as 'savings' | 'current' | 'od' })}
              >
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  <SelectItem value="savings" className="text-blue-100 focus:bg-blue-800/30">Savings</SelectItem>
                  <SelectItem value="current" className="text-blue-100 focus:bg-blue-800/30">Current</SelectItem>
                  <SelectItem value="od" className="text-blue-100 focus:bg-blue-800/30">Overdraft (OD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_name" className="text-blue-200">Account Name *</Label>
              <Input
                id="account_name"
                placeholder="e.g., Main Business Account"
                value={formData.account_name}
                onChange={e => setFormData({ ...formData, account_name: e.target.value })}
                required
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number" className="text-blue-200">Account Number *</Label>
              <Input
                id="account_number"
                placeholder="Enter account number"
                value={formData.account_number}
                onChange={e => setFormData({ ...formData, account_number: e.target.value })}
                required
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank_name" className="text-blue-200">Bank Name *</Label>
              <Input
                id="bank_name"
                placeholder="e.g., State Bank of India"
                value={formData.bank_name}
                onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                required
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifsc_code" className="text-blue-200">IFSC Code</Label>
              <Input
                id="ifsc_code"
                placeholder="e.g., SBIN0001234"
                value={formData.ifsc_code}
                onChange={e => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_name" className="text-blue-200">Branch Name</Label>
              <Input
                id="branch_name"
                placeholder="Enter branch name"
                value={formData.branch_name}
                onChange={e => setFormData({ ...formData, branch_name: e.target.value })}
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opening_balance" className="text-blue-200">Opening Balance</Label>
              <Input
                id="opening_balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.opening_balance || ''}
                onChange={e => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                disabled={isEditing}
              />
              {isEditing && (
                <p className="text-xs text-blue-400">Opening balance cannot be changed after creation</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={createBankAccount.isPending || updateBankAccount.isPending}
              className="flex-1 cyber-button font-semibold text-primary-foreground"
            >
              {(createBankAccount.isPending || updateBankAccount.isPending) 
                ? 'Saving...' 
                : isEditing ? 'Update Account' : 'Add Account'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="neon-border bg-slate-800/50 text-blue-100"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
