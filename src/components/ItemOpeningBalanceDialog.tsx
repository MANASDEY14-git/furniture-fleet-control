import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStores } from '@/hooks/useStores';
import { useItemOpeningBalances, useUpsertItemOpeningBalance } from '@/hooks/useItemOpeningBalances';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import { Calendar as CalendarIcon, Package, Store } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface ItemOpeningBalanceDialogProps {
  items: any[];
  defaultItemId?: string;
  defaultStoreId?: string;
  trigger?: React.ReactNode;
}

export default function ItemOpeningBalanceDialog({ 
  items, 
  defaultItemId = '', 
  defaultStoreId = '', 
  trigger 
}: ItemOpeningBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState(defaultItemId);
  const [storeId, setStoreId] = useState(defaultStoreId);
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');

  const { data: stores = [] } = useStores();
  const { selectedYear } = useFinancialYear();
  const { data: openingBalances = [] } = useItemOpeningBalances(
    itemId || undefined,
    storeId || undefined,
    selectedYear?.id
  );
  const upsertBalance = useUpsertItemOpeningBalance();

  // Reset/sync local state with defaults when dialog opens
  useEffect(() => {
    if (open) {
      if (defaultItemId) setItemId(defaultItemId);
      if (defaultStoreId) setStoreId(defaultStoreId);
    }
  }, [open, defaultItemId, defaultStoreId]);

  // Load financial year start date as default effective date
  useEffect(() => {
    if (selectedYear && open) {
      setEffectiveDate(new Date(selectedYear.start_date));
    }
  }, [selectedYear, open]);

  // Load existing opening balance if item + store is selected
  useEffect(() => {
    if (itemId && storeId && selectedYear && open) {
      const existing = openingBalances.find(
        ob => ob.item_id === itemId && 
              ob.store_id === storeId && 
              ob.financial_year_id === selectedYear.id
      );

      if (existing) {
        setQuantity(existing.opening_quantity.toString());
        setUnitCost(existing.opening_unit_cost.toString());
        setEffectiveDate(new Date(existing.effective_date));
        setNotes(existing.notes || '');
      } else {
        setQuantity('');
        // Default unit cost to selected item's cost price
        const selectedItem = items.find(i => i.id === itemId);
        setUnitCost(selectedItem?.cost_price?.toString() || '');
        setNotes('');
        if (selectedYear) {
          setEffectiveDate(new Date(selectedYear.start_date));
        }
      }
    }
  }, [itemId, storeId, open, openingBalances, selectedYear, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemId || !storeId || !quantity || !unitCost || !effectiveDate || !selectedYear) {
      return;
    }

    await upsertBalance.mutateAsync({
      item_id: itemId,
      store_id: storeId,
      financial_year_id: selectedYear.id,
      opening_quantity: parseFloat(quantity),
      opening_unit_cost: parseFloat(unitCost),
      effective_date: format(effectiveDate, 'yyyy-MM-dd'),
      notes: notes || undefined,
    });

    setOpen(false);
  };

  const selectedItemData = items.find(i => i.id === itemId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="text-cyan-400 border-cyan-400/50 hover:bg-cyan-900/20">
            <Package className="w-4 h-4 mr-2" />
            Set Opening Balance
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Package className="w-5 h-5" />
            Set Item Opening Balance
          </DialogTitle>
        </DialogHeader>
        
        {selectedYear ? (
          <div className="text-xs text-blue-300 mb-2 border border-blue-500/20 bg-blue-950/30 rounded p-2">
            Active Financial Year: <span className="font-semibold text-white">{selectedYear.label}</span> ({format(new Date(selectedYear.start_date), 'dd MMM yyyy')} - {format(new Date(selectedYear.end_date), 'dd MMM yyyy')})
          </div>
        ) : (
          <div className="text-xs text-red-400 mb-2 border border-red-500/20 bg-red-950/30 rounded p-2">
            No active financial year selected. Please select a financial year first.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Selector (Only show/enable if not pre-provided) */}
          <div className="space-y-2">
            <Label className="text-blue-200">Item *</Label>
            <Select 
              value={itemId} 
              onValueChange={setItemId} 
              disabled={!!defaultItemId}
              required
            >
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/30 max-h-[200px]">
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id} className="text-blue-100 focus:bg-blue-800/30">
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Store Selector */}
          <div className="space-y-2">
            <Label className="text-blue-200">Store / Outlet *</Label>
            <Select 
              value={storeId} 
              onValueChange={setStoreId} 
              disabled={!!defaultStoreId}
              required
            >
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

          <div className="grid grid-cols-2 gap-4">
            {/* Opening Quantity */}
            <div className="space-y-2">
              <Label className="text-blue-200">Opening Qty *</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="neon-border bg-slate-800/50 text-blue-100"
                required
              />
            </div>

            {/* Opening Unit Cost */}
            <div className="space-y-2">
              <Label className="text-blue-200">Unit Cost (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="neon-border bg-slate-800/50 text-blue-100"
                required
              />
            </div>
          </div>

          {/* Effective Date */}
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
                  <CalendarIcon className="mr-2 h-4 w-4 text-cyan-400" />
                  {effectiveDate ? format(effectiveDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={effectiveDate}
                  onSelect={(date) => date && setEffectiveDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-blue-300">
              Usually matches the start of the selected financial year.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-blue-200">Notes</Label>
            <Textarea
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100"
              rows={2}
            />
          </div>

          {/* Dialog Action Buttons */}
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
              disabled={upsertBalance.isPending || !itemId || !storeId || !quantity || !unitCost || !selectedYear}
              className="flex-1 cyber-button text-white"
            >
              {upsertBalance.isPending ? 'Saving...' : 'Save Balance'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
