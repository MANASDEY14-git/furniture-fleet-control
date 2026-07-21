import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateStockAdjustment } from '@/hooks/useStockAdjustments';
import { useStores } from '@/hooks/useStores';
import { ClipboardEdit } from 'lucide-react';
import StockLedgerItemSelector from './StockLedgerItemSelector';

interface StockAdjustmentDialogProps {
  items: any[];
}

export default function StockAdjustmentDialog({ items }: StockAdjustmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState<string>('');
  const [storeId, setStoreId] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'damaged' | 'theft' | 'physical_count' | 'other'>('physical_count');
  const [quantityChange, setQuantityChange] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const { data: stores = [] } = useStores();
  const createAdjustment = useCreateStockAdjustment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemId || !storeId || !quantityChange) {
      return;
    }

    await createAdjustment.mutateAsync({
      item_id: itemId,
      store_id: storeId,
      adjustment_type: adjustmentType,
      quantity_change: parseInt(quantityChange),
      reason,
      notes,
    });

    // Reset form
    setItemId('');
    setStoreId('');
    setAdjustmentType('physical_count');
    setQuantityChange('');
    setReason('');
    setNotes('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <ClipboardEdit className="w-4 h-4 mr-2" />
          Stock Adjustment
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-blue-500/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Stock Adjustment</DialogTitle>
          <DialogDescription className="text-blue-200">
            Manually adjust inventory for damaged goods, theft, or physical count corrections.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item" className="text-blue-200">Item *</Label>
            <StockLedgerItemSelector
              selectedItemId={itemId}
              items={items}
              onItemChange={setItemId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="store" className="text-blue-200">Store *</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger className="bg-slate-700 border-blue-500/30 text-white">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-blue-500/30">
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id} className="text-white">
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-blue-200">Adjustment Type *</Label>
            <Select value={adjustmentType} onValueChange={(value: any) => setAdjustmentType(value)}>
              <SelectTrigger className="bg-slate-700 border-blue-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-blue-500/30">
                <SelectItem value="physical_count" className="text-white">Physical Count Correction</SelectItem>
                <SelectItem value="damaged" className="text-white">Damaged Goods</SelectItem>
                <SelectItem value="theft" className="text-white">Theft/Loss</SelectItem>
                <SelectItem value="other" className="text-white">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-blue-200">
              Quantity Change * (use negative numbers to decrease)
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              placeholder="e.g., -5 or +10"
              className="bg-slate-700 border-blue-500/30 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-blue-200">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for adjustment"
              className="bg-slate-700 border-blue-500/30 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-blue-200">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about this adjustment"
              className="bg-slate-700 border-blue-500/30 text-white"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-blue-500/30 text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={createAdjustment.isPending}
            >
              {createAdjustment.isPending ? 'Creating...' : 'Create Adjustment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
