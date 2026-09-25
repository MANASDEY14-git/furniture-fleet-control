import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useItems } from '@/hooks/useItems';
import { useCreateStockTransfer } from '@/hooks/useStockTransfers';
import { useStoreContext } from '@/contexts/StoreContext';
import { formatCurrency } from '@/utils/currencyUtils';

interface DraftLine {
  itemId: string;
  quantity: string;
  price: string;
  note: string;
}

const emptyLine = (): DraftLine => ({ itemId: '', quantity: '1', price: '', note: '' });

export function TransferFormDialog() {
  const { accessibleStores, activeStoreId } = useStoreContext();
  const [open, setOpen] = useState(false);
  const [sourceStoreId, setSourceStoreId] = useState(activeStoreId === 'all' ? '' : activeStoreId);
  const [destinationStoreId, setDestinationStoreId] = useState('');
  const [reason, setReason] = useState('Stock replenishment');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState('');
  const [transporter, setTransporter] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const { data: items = [] } = useItems(sourceStoreId || undefined);
  const createTransfer = useCreateStockTransfer();

  const availableItems = useMemo(
    () => items.filter((item) => item.store_id === sourceStoreId && Number(item.quantity_available) > 0),
    [items, sourceStoreId],
  );
  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0);

  const updateLine = (index: number, key: keyof DraftLine, value: string) => {
    setLines((current) => current.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      if (key === 'itemId') {
        const item = availableItems.find((candidate) => candidate.id === value);
        return { ...line, itemId: value, price: item ? String(item.cost_price) : '' };
      }
      return { ...line, [key]: value };
    }));
  };

  const reset = () => {
    setDestinationStoreId('');
    setReason('Stock replenishment');
    setExpectedDate('');
    setTransporter('');
    setVehicle('');
    setNotes('');
    setLines([emptyLine()]);
  };

  const canSubmit = sourceStoreId && destinationStoreId && reason.trim() && lines.every((line) => {
    const item = availableItems.find((candidate) => candidate.id === line.itemId);
    const quantity = Number(line.quantity);
    return item && quantity > 0 && Number.isInteger(quantity) && quantity <= Number(item.quantity_available) && Number(line.price) > 0;
  });

  const submit = async () => {
    if (!canSubmit) return;
    await createTransfer.mutateAsync({
      sourceStoreId,
      destinationStoreId,
      reason: reason.trim(),
      plannedDispatchDate: plannedDate,
      expectedArrivalDate: expectedDate,
      transporterName: transporter,
      vehicleNumber: vehicle,
      notes,
      lines: lines.map((line) => ({
        source_item_id: line.itemId,
        quantity: Number(line.quantity),
        unit_transfer_price: Number(line.price),
        condition_note: line.note,
      })),
    });
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> New transfer</Button></DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create transfer batch</DialogTitle>
          <DialogDescription>Add multiple items and set the carrying price for each line.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>From godown</Label>
            <Select value={sourceStoreId} onValueChange={(value) => { setSourceStoreId(value); setLines([emptyLine()]); }}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>{accessibleStores.map((store) => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To godown</Label>
            <Select value={destinationStoreId} onValueChange={setDestinationStoreId}>
              <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
              <SelectContent>{accessibleStores.filter((store) => store.id !== sourceStoreId).map((store) => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Reason</Label><Input value={reason} onChange={(event) => setReason(event.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Dispatch date</Label><Input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} /></div>
            <div className="space-y-2"><Label>Expected arrival</Label><Input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Transporter</Label><Input value={transporter} onChange={(event) => setTransporter(event.target.value)} placeholder="Optional" /></div>
          <div className="space-y-2"><Label>Vehicle number</Label><Input value={vehicle} onChange={(event) => setVehicle(event.target.value)} placeholder="Optional" /></div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between"><Label>Items in this batch</Label><Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, emptyLine()])}><Plus /> Add item</Button></div>
          {lines.map((line, index) => {
            const item = availableItems.find((candidate) => candidate.id === line.itemId);
            return (
              <div key={index} className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-[minmax(220px,2fr)_100px_140px_1fr_40px]">
                <div className="space-y-1"><Label>Item</Label><Select value={line.itemId} onValueChange={(value) => updateLine(index, 'itemId', value)}><SelectTrigger><SelectValue placeholder="Choose item" /></SelectTrigger><SelectContent>{availableItems.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.quantity_available} available</SelectItem>)}</SelectContent></Select>{item && <p className="text-xs text-muted-foreground">Recorded cost {formatCurrency(item.cost_price)}</p>}</div>
                <div className="space-y-1"><Label>Quantity</Label><Input type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} /></div>
                <div className="space-y-1"><Label>Transfer price</Label><Input type="number" min="0.01" step="0.01" value={line.price} onChange={(event) => updateLine(index, 'price', event.target.value)} /></div>
                <div className="space-y-1"><Label>Line note</Label><Input value={line.note} onChange={(event) => updateLine(index, 'note', event.target.value)} placeholder="Optional" /></div>
                <div className="pt-6"><Button type="button" variant="ghost" size="icon" aria-label="Remove item" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><Trash2 /></Button></div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2"><Label>Batch notes</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Handling instructions or internal notes" /></div>
        <DialogFooter className="items-center justify-between sm:justify-between">
          <p className="text-sm font-semibold">Batch value {formatCurrency(total)}</p>
          <Button onClick={submit} disabled={!canSubmit || createTransfer.isPending}>{createTransfer.isPending ? 'Saving…' : 'Save draft'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}