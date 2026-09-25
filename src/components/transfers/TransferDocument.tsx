import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StockTransfer } from '@/hooks/useStockTransfers';
import { formatCurrency } from '@/utils/currencyUtils';

interface Props {
  transfer: StockTransfer;
  sourceName: string;
  destinationName: string;
}

export function TransferDocument({ transfer, sourceName, destinationName }: Props) {
  const printDocument = () => window.print();
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Printer /> Challan</Button></DialogTrigger>
      <DialogContent className="max-w-3xl print:static print:max-w-none print:translate-x-0 print:translate-y-0 print:border-0 print:shadow-none">
        <DialogHeader className="print:hidden"><DialogTitle>Transfer challan</DialogTitle></DialogHeader>
        <section className="space-y-6" aria-label="Transfer challan">
          <header className="border-b pb-4 text-center"><p className="text-xs font-semibold uppercase text-muted-foreground">Stock transfer challan</p><h2 className="mt-1 text-2xl font-bold">{transfer.challan_number}</h2></header>
          <div className="grid grid-cols-2 gap-6 text-sm"><div><p className="text-muted-foreground">From</p><p className="font-semibold">{sourceName}</p></div><div><p className="text-muted-foreground">To</p><p className="font-semibold">{destinationName}</p></div><div><p className="text-muted-foreground">Dispatched</p><p>{transfer.dispatched_at ? new Date(transfer.dispatched_at).toLocaleString('en-IN') : 'Not dispatched'}</p></div><div><p className="text-muted-foreground">Vehicle / transporter</p><p>{[transfer.vehicle_number, transfer.transporter_name].filter(Boolean).join(' · ') || '—'}</p></div></div>
          <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Value</th></tr></thead><tbody>{transfer.stock_transfer_lines.map((line) => <tr key={line.id} className="border-b"><td className="py-3">{line.item_name_snapshot}</td><td className="py-3 text-right">{line.quantity_dispatched} {line.unit_snapshot}</td><td className="py-3 text-right">{formatCurrency(line.unit_transfer_price)}</td><td className="py-3 text-right font-medium">{formatCurrency(Number(line.line_value))}</td></tr>)}</tbody><tfoot><tr><td className="pt-4 font-semibold">Total</td><td className="pt-4 text-right font-semibold">{transfer.total_quantity}</td><td /><td className="pt-4 text-right font-semibold">{formatCurrency(transfer.total_value)}</td></tr></tfoot></table>
          <p className="text-xs text-muted-foreground">Internal stock transfer record. Values are frozen at dispatch. GST documents, where applicable, are handled outside this module.</p>
          <div className="grid grid-cols-2 gap-12 pt-12 text-center text-sm"><div className="border-t pt-2">Source manager</div><div className="border-t pt-2">Destination manager</div></div>
        </section>
        <div className="flex justify-end print:hidden"><Button onClick={printDocument}><Printer /> Print</Button></div>
      </DialogContent>
    </Dialog>
  );
}