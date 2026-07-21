import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStores } from '@/hooks/useStores';
import { useSupplierOpeningBalances, useUpsertOpeningBalance } from '@/hooks/useSupplierOpeningBalances';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface OpeningBalanceDialogProps {
  supplier: { id: string; name: string };
  trigger: React.ReactNode;
  defaultStoreId?: string;
}

export default function OpeningBalanceDialog({ supplier, trigger, defaultStoreId }: OpeningBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [storeId, setStoreId] = useState(defaultStoreId || '');
  const [amount, setAmount] = useState('');
  const [balanceType, setBalanceType] = useState<'debit' | 'credit'>('debit');
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  const { data: stores = [] } = useStores();
  const { data: openingBalances = [] } = useSupplierOpeningBalances();
  const upsertBalance = useUpsertOpeningBalance();

  // Load existing balance when store changes
  useEffect(() => {
    if (storeId && open) {
      const existing = openingBalances.find(
        ob => ob.supplier_id === supplier.id && ob.store_id === storeId
      );
      if (existing) {
        setAmount(Math.abs(existing.opening_balance).toString());
        setBalanceType(existing.balance_type);
        setEffectiveDate(new Date(existing.effective_date));
        setNotes(existing.notes || '');
      } else {
        setAmount('');
        setBalanceType('debit');
        setNotes('');
      }
    }
  }, [storeId, open, openingBalances, supplier.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeId || !amount || !effectiveDate) return;

    await upsertBalance.mutateAsync({
      supplier_id: supplier.id,
      store_id: storeId,
      opening_balance: parseFloat(amount),
      balance_type: balanceType,
      effective_date: format(effectiveDate, 'yyyy-MM-dd'),
      notes: notes || undefined,
    });

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">
            Set Opening Balance - {supplier.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-blue-200">Store *</Label>
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
            <Label className="text-blue-200">Opening Balance Amount *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-blue-200">Balance Type *</Label>
            <Select value={balanceType} onValueChange={(v) => setBalanceType(v as 'debit' | 'credit')}>
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/30">
                <SelectItem value="debit" className="text-blue-100 focus:bg-blue-800/30">
                  Debit (We owe supplier)
                </SelectItem>
                <SelectItem value="credit" className="text-blue-100 focus:bg-blue-800/30">
                  Credit (Supplier owes us / Advance)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-blue-300">
              {balanceType === 'debit' 
                ? 'Amount payable to supplier at accounting start date'
                : 'Advance paid to supplier at accounting start date'}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-blue-200">Effective Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal neon-border bg-slate-800/50 text-blue-100",
                    !effectiveDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {effectiveDate ? format(effectiveDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={effectiveDate}
                  onSelect={setEffectiveDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-blue-300">
              The date from which this opening balance is effective (usually your accounting start date)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-blue-200">Notes</Label>
            <Textarea
              placeholder="Optional notes about this opening balance"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100"
              rows={2}
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
              disabled={upsertBalance.isPending || !storeId || !amount}
              className="flex-1 cyber-button text-white"
            >
              {upsertBalance.isPending ? 'Saving...' : 'Save Opening Balance'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
