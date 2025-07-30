
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSingleSalesOrder } from '@/hooks/useSingleSalesOrder';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency } from '@/utils/currencyUtils';

interface OrderDetailsDialogProps {
  viewingOrder: any;
  setViewingOrder: (order: any) => void;
  getStoreName: (storeId: string) => string;
}

export default function OrderDetailsDialog({
  viewingOrder,
  setViewingOrder,
  getStoreName,
}: OrderDetailsDialogProps) {
  const { data: order, isLoading, error } = useSingleSalesOrder(
    viewingOrder?.sale_id || null
  );

  const orderItems = order?.sales_order_items || [];

  if (!viewingOrder) {
    // Always return a valid React element for React 18+ strict mode
    return (
      <Dialog open={false}>
        <DialogContent className="simple-card max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Order Details</DialogTitle>
            <DialogDescription>
              No order selected.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

    if (isLoading) {
    return (
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="simple-card max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Loading Order...</DialogTitle>
            <DialogDescription>
              Loading order details. Please wait.
            </DialogDescription>
          </DialogHeader>
          <div>Loading order details...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="simple-card max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Error</DialogTitle>
            <DialogDescription>
              Failed to load order details. Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="text-destructive">Failed to load order details. Please try again.</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) {
    // This handles the case where the query has run but returned no data.
    return (
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="simple-card max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Order Not Found</DialogTitle>
            <DialogDescription>
              The selected order could not be found.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
      <DialogContent className="simple-card max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Order Details - {viewingOrder.order_number}</DialogTitle>
          <DialogDescription>
            Detailed information about the selected order, including customer details, order items, and payment summary.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-foreground"><strong>Customer:</strong> {viewingOrder.customer_name || 'Walk-in'}</p>
              <p className="text-foreground"><strong>Phone:</strong> {viewingOrder.customer_phone || 'N/A'}</p>
              <p className="text-foreground"><strong>Store:</strong> {getStoreName(viewingOrder.store_id)}</p>
            </div>
            <div>
              <p className="text-foreground"><strong>Date:</strong> {new Date(viewingOrder.sale_date).toLocaleDateString('en-GB')}</p>
              <p className="text-foreground"><strong>Status:</strong> <StatusBadge status={viewingOrder.delivery_status} /></p>
              <p className="text-foreground"><strong>Delivery:</strong> {viewingOrder.delivery_date ? new Date(viewingOrder.delivery_date).toLocaleDateString('en-GB') : 'Not Set'}</p>
            </div>
          </div>
          {viewingOrder.customer_address && (
            <div>
              <p className="text-foreground"><strong>Address:</strong></p>
              <p className="text-muted-foreground ml-4">{viewingOrder.customer_address}</p>
            </div>
          )}

          {/* Order Items */}
          <div className="border-t border-border pt-4">
            <h4 className="text-foreground font-semibold mb-2">Order Items</h4>
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Item</TableHead>
                    
                    <TableHead className="text-muted-foreground">Quantity</TableHead>
                    <TableHead className="text-muted-foreground">Unit Price</TableHead>
                    <TableHead className="text-muted-foreground">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Use the new fetched orderItems
                    if (!orderItems || orderItems.length === 0) {
                      return (
                         <TableRow>
                           <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                             No order items found
                           </TableCell>
                         </TableRow>
                      );
                    }
                    
                    return orderItems.map((item: any) => {
                      return (
                        <TableRow key={item.id} className="border-border">
                          <TableCell className="text-foreground">{item.item_name}</TableCell>
                          <TableCell className="text-foreground">{item.quantity}</TableCell>
                          <TableCell className="text-foreground">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-foreground font-semibold">{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Amount</p>
              <p className="text-foreground font-bold text-lg">{formatCurrency(viewingOrder.total_price)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Total Paid</p>
              <p className="text-foreground font-bold text-lg">{formatCurrency(viewingOrder.total_paid)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Balance Due</p>
              <p className="text-foreground font-bold text-lg">{formatCurrency(viewingOrder.balance_due)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
