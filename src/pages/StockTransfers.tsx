import { useMemo, useState } from 'react';
import { ArrowRight, Ban, Boxes, PackageCheck, Send, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStoreContext } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCancelStockTransfer, useDispatchStockTransfer, useStockTransfers, StockTransfer } from '@/hooks/useStockTransfers';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { formatCurrency } from '@/utils/currencyUtils';
import { TransferFormDialog } from '@/components/transfers/TransferFormDialog';
import { ReceiveTransferDialog } from '@/components/transfers/ReceiveTransferDialog';
import { TransferDocument } from '@/components/transfers/TransferDocument';
import { TransferSettingsDialog } from '@/components/transfers/TransferSettingsDialog';

type Queue = 'drafts' | 'dispatch' | 'transit' | 'receive' | 'discrepancies' | 'history';

const statusLabels: Record<string, string> = {
  draft: 'Draft', in_transit: 'In transit', partially_received: 'Part received', received: 'Received',
  received_with_discrepancy: 'Discrepancy', cancelled: 'Cancelled',
};

export default function StockTransfers() {
  const [queue, setQueue] = useState<Queue>('drafts');
  const { activeStoreId, accessibleStores } = useStoreContext();
  const { user } = useAuth();
  const { data: role } = useCurrentUserRole();
  const { data: transfers = [], isLoading } = useStockTransfers(activeStoreId);
  const dispatch = useDispatchStockTransfer();
  const cancel = useCancelStockTransfer();
  const canManage = Boolean(role?.isAdmin || role?.isManager);
  const names = useMemo(() => Object.fromEntries(accessibleStores.map((store) => [store.id, store.name])), [accessibleStores]);

  const filtered = transfers.filter((transfer) => {
    if (queue === 'drafts') return transfer.status === 'draft';
    if (queue === 'dispatch') return transfer.status === 'draft' && (activeStoreId === 'all' || transfer.source_store_id === activeStoreId);
    if (queue === 'transit') return transfer.status === 'in_transit' || transfer.status === 'partially_received';
    if (queue === 'receive') return ['in_transit', 'partially_received'].includes(transfer.status) && (activeStoreId === 'all' || transfer.destination_store_id === activeStoreId);
    if (queue === 'discrepancies') return transfer.status === 'received_with_discrepancy';
    return ['received', 'received_with_discrepancy', 'cancelled'].includes(transfer.status);
  });

  const receiveAllowed = (transfer: StockTransfer) => canManage && transfer.dispatched_by !== user?.id && (activeStoreId === 'all' || transfer.destination_store_id === activeStoreId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-semibold">Godown transfers</h2><p className="text-sm text-muted-foreground">Batch stock movement with dispatch and independent receipt control.</p></div>
        {canManage && <div className="flex gap-2"><TransferSettingsDialog /><TransferFormDialog /></div>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><Boxes className="text-muted-foreground" /><div><p className="text-2xl font-semibold">{transfers.filter((t) => t.status === 'draft').length}</p><p className="text-xs text-muted-foreground">Draft batches</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Send className="text-muted-foreground" /><div><p className="text-2xl font-semibold">{transfers.filter((t) => ['in_transit', 'partially_received'].includes(t.status)).length}</p><p className="text-xs text-muted-foreground">In transit</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><PackageCheck className="text-muted-foreground" /><div><p className="text-2xl font-semibold">{transfers.filter((t) => t.status === 'received').length}</p><p className="text-xs text-muted-foreground">Received</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><TriangleAlert className="text-destructive" /><div><p className="text-2xl font-semibold">{transfers.filter((t) => t.status === 'received_with_discrepancy').length}</p><p className="text-xs text-muted-foreground">Discrepancies</p></div></CardContent></Card>
      </div>

      <Tabs value={queue} onValueChange={(value) => setQueue(value as Queue)}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="drafts">Draft batches</TabsTrigger><TabsTrigger value="dispatch">To dispatch</TabsTrigger><TabsTrigger value="transit">In transit</TabsTrigger><TabsTrigger value="receive">To receive</TabsTrigger><TabsTrigger value="discrepancies">Discrepancies</TabsTrigger><TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Movement</TableHead><TableHead>Items</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Loading transfers…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No transfers in this queue</TableCell></TableRow>}
            {filtered.map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell><p className="font-medium">{transfer.challan_number || transfer.draft_reference}</p><p className="text-xs text-muted-foreground">{new Date(transfer.created_at).toLocaleDateString('en-IN')}</p></TableCell>
                <TableCell><div className="flex items-center gap-2"><span>{names[transfer.source_store_id] || 'Source'}</span><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /><span>{names[transfer.destination_store_id] || 'Destination'}</span></div><p className="mt-1 text-xs text-muted-foreground">{transfer.transfer_reason}</p></TableCell>
                <TableCell>{transfer.stock_transfer_lines.length} lines · {transfer.total_quantity} units</TableCell>
                <TableCell className="font-medium">{formatCurrency(transfer.total_value)}</TableCell>
                <TableCell><Badge variant={transfer.status === 'received_with_discrepancy' ? 'destructive' : transfer.status === 'received' ? 'default' : 'secondary'}>{statusLabels[transfer.status] || transfer.status}</Badge></TableCell>
                <TableCell><div className="flex justify-end gap-2">
                  {transfer.challan_number && <TransferDocument transfer={transfer} sourceName={names[transfer.source_store_id] || 'Source godown'} destinationName={names[transfer.destination_store_id] || 'Destination godown'} />}
                  {queue === 'dispatch' && canManage && <Button size="sm" onClick={() => dispatch.mutate(transfer.id)} disabled={dispatch.isPending}><Send /> Dispatch</Button>}
                  {queue === 'receive' && receiveAllowed(transfer) && <ReceiveTransferDialog transfer={transfer} />}
                  {transfer.status === 'draft' && canManage && <Button variant="ghost" size="icon" aria-label="Cancel transfer" onClick={() => cancel.mutate({ transferId: transfer.id, reason: 'Cancelled by manager' })} disabled={cancel.isPending}><Ban /></Button>}
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}