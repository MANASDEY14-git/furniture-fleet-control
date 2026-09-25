import { useEffect, useState } from 'react';
import { PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StockTransfer, useReceiveStockTransfer } from '@/hooks/useStockTransfers';

interface Props { transfer: StockTransfer }

export function ReceiveTransferDialog({ transfer }: Props) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<Record<string, { received: number; damaged: number; short: number; note: string }>>({});
  const receive = useReceiveStockTransfer();

  useEffect(() => {
    if (!open) return;
    setEntries(Object.fromEntries(transfer.stock_transfer_lines.map((line) => {
      const outstanding = Number(line.quantity_dispatched) - Number(line.quantity_received) - Number(line.quantity_damaged) - Number(line.quantity_short);
      return [line.id, { received: Math.max(0, outstanding), damaged: 0, short: 0, note: '' }];
    })));
  }, [open, transfer.stock_transfer_lines]);

  const update = (id: string, key: 'received' | 'damaged' | 'short' | 'note', value: string) => {
    setEntries((current) => ({ ...current, [id]: { ...current[id], [key]: key === 'note' ? value : Number(value) } }));
  };

  const isValid = transfer.stock_transfer_lines.every((line) => {
    const entry = entries[line.id];
    if (!entry) return false;
    const outstanding = Number(line.quantity_dispatched) - Number(line.quantity_received) - Number(line.quantity_damaged) - Number(line.quantity_short);
    const accounted = entry.received + entry.damaged + entry.short;
    return accounted > 0 && accounted <= outstanding && [entry.received, entry.damaged, entry.short].every((value) => value >= 0 && Number.isInteger(value));
  });

  const submit = async () => {
    if (!isValid) return;
    await receive.mutateAsync({
      transferId: transfer.id,
      notes,
      lines: transfer.stock_transfer_lines.map((line) => ({
        transfer_line_id: line.id,
        quantity_received: entries[line.id]?.received ?? 0,
        quantity_damaged: entries[line.id]?.damaged ?? 0,
        quantity_short: entries[line.id]?.short ?? 0,
        discrepancy_note: entries[line.id]?.note || undefined,
      })),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><PackageCheck /> Receive</Button></DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Receive {transfer.challan_number}</DialogTitle><DialogDescription>Count every line independently. Damaged and short quantities remain visible as discrepancies.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          {transfer.stock_transfer_lines.map((line) => {
            const outstanding = Number(line.quantity_dispatched) - Number(line.quantity_received) - Number(line.quantity_damaged) - Number(line.quantity_short);
            const entry = entries[line.id];
            return (
              <div key={line.id} className="rounded-lg border bg-card p-3">
                <div className="mb-3 flex items-center justify-between"><div><p className="font-medium">{line.item_name_snapshot}</p><p className="text-xs text-muted-foreground">{outstanding} {line.unit_snapshot} awaiting receipt</p></div></div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1"><Label>Accepted</Label><Input type="number" min="0" step="1" value={entry?.received ?? 0} onChange={(event) => update(line.id, 'received', event.target.value)} /></div>
                  <div className="space-y-1"><Label>Damaged</Label><Input type="number" min="0" step="1" value={entry?.damaged ?? 0} onChange={(event) => update(line.id, 'damaged', event.target.value)} /></div>
                  <div className="space-y-1"><Label>Short</Label><Input type="number" min="0" step="1" value={entry?.short ?? 0} onChange={(event) => update(line.id, 'short', event.target.value)} /></div>
                  <div className="space-y-1"><Label>Discrepancy note</Label><Input value={entry?.note ?? ''} onChange={(event) => update(line.id, 'note', event.target.value)} /></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-2"><Label>Receipt notes</Label><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
        <DialogFooter><Button onClick={submit} disabled={!isValid || receive.isPending}>{receive.isPending ? 'Recording…' : 'Confirm receipt'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}