
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useSingleSalesOrder } from '@/hooks/useSingleSalesOrder';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency } from '@/utils/currencyUtils';
import { useIsMobile } from '@/hooks/use-mobile';

interface OrderDetailsDialogProps {
  viewingOrder: any;
  setViewingOrder: (order: any) => void;
  getStoreName: (storeId: string) => string;
  canAccessPII?: boolean;
}

export default function OrderDetailsDialog({
  viewingOrder,
  setViewingOrder,
  getStoreName,
  canAccessPII = false
}: OrderDetailsDialogProps) {
  const isMobile = useIsMobile();
  const { data: order, isLoading, error } = useSingleSalesOrder(
    viewingOrder?.sale_id || null
  );

  const orderItems = order?.sales_order_items || [];

  if (!viewingOrder) {
    return null;
  }

  if (isLoading) {
    const LoadingContent = () => (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <Drawer open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
          <DrawerContent className="simple-card">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">Loading Order...</DrawerTitle>
              <DrawerDescription>
                Loading order details. Please wait.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <LoadingContent />
            </div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="simple-card max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Loading Order...</DialogTitle>
            <DialogDescription>
              Loading order details. Please wait.
            </DialogDescription>
          </DialogHeader>
          <LoadingContent />
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !order) {
    const ErrorContent = () => (
      <div className="text-center py-8">
        <p className="text-destructive">
          {error ? 'Failed to load order details. Please try again.' : 'Order not found.'}
        </p>
      </div>
    );

    if (isMobile) {
      return (
        <Drawer open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
          <DrawerContent className="simple-card">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">
                {error ? 'Error' : 'Order Not Found'}
              </DrawerTitle>
              <DrawerDescription>
                {error ? 'Failed to load order details.' : 'The selected order could not be found.'}
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              <ErrorContent />
            </div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="simple-card max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {error ? 'Error' : 'Order Not Found'}
            </DialogTitle>
            <DialogDescription>
              {error ? 'Failed to load order details.' : 'The selected order could not be found.'}
            </DialogDescription>
          </DialogHeader>
          <ErrorContent />
        </DialogContent>
      </Dialog>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Customer and Order Info */}
      {isMobile ? (
        <div className="space-y-4">
          <Card className="futuristic-card">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-blue-300 font-medium">Customer</p>
                <p className="text-foreground">{
                  canAccessPII && viewingOrder.customer_name && viewingOrder.customer_name !== '***REDACTED***' 
                    ? viewingOrder.customer_name 
                    : (viewingOrder.customer_name === '***REDACTED***' ? '***REDACTED***' : 'Walk-in')
                }</p>
              </div>
              <div>
                <p className="text-xs text-blue-300 font-medium">Phone</p>
                <p className="text-foreground">{
                  canAccessPII && viewingOrder.customer_phone && viewingOrder.customer_phone !== '***REDACTED***' 
                    ? viewingOrder.customer_phone 
                    : (viewingOrder.customer_phone === '***REDACTED***' ? '***REDACTED***' : 'N/A')
                }</p>
              </div>
              <div>
                <p className="text-xs text-blue-300 font-medium">Store</p>
                <p className="text-foreground">{getStoreName(viewingOrder.store_id)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="futuristic-card">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-blue-300 font-medium">Date</p>
                <p className="text-foreground">{new Date(viewingOrder.sale_date).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-xs text-blue-300 font-medium">Status</p>
                <StatusBadge status={viewingOrder.delivery_status} />
              </div>
              <div>
                <p className="text-xs text-blue-300 font-medium">Delivery</p>
                <p className="text-foreground">{viewingOrder.delivery_date ? new Date(viewingOrder.delivery_date).toLocaleDateString('en-GB') : 'Not Set'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-foreground"><strong>Customer:</strong> {
              canAccessPII && viewingOrder.customer_name && viewingOrder.customer_name !== '***REDACTED***' 
                ? viewingOrder.customer_name 
                : (viewingOrder.customer_name === '***REDACTED***' ? '***REDACTED***' : 'Walk-in')
            }</p>
            <p className="text-foreground"><strong>Phone:</strong> {
              canAccessPII && viewingOrder.customer_phone && viewingOrder.customer_phone !== '***REDACTED***' 
                ? viewingOrder.customer_phone 
                : (viewingOrder.customer_phone === '***REDACTED***' ? '***REDACTED***' : 'N/A')
            }</p>
            <p className="text-foreground"><strong>Store:</strong> {getStoreName(viewingOrder.store_id)}</p>
          </div>
          <div>
            <p className="text-foreground"><strong>Date:</strong> {new Date(viewingOrder.sale_date).toLocaleDateString('en-GB')}</p>
            <p className="text-foreground"><strong>Status:</strong> <StatusBadge status={viewingOrder.delivery_status} /></p>
            <p className="text-foreground"><strong>Delivery:</strong> {viewingOrder.delivery_date ? new Date(viewingOrder.delivery_date).toLocaleDateString('en-GB') : 'Not Set'}</p>
          </div>
        </div>
      )}

      {/* Address (if available) */}
      {canAccessPII && viewingOrder.customer_address && viewingOrder.customer_address !== '***REDACTED***' && (
        <div>
          <p className="text-foreground"><strong>Address:</strong></p>
          <p className="text-muted-foreground ml-4">{viewingOrder.customer_address}</p>
        </div>
      )}
      {!canAccessPII && viewingOrder.customer_address === '***REDACTED***' && (
        <div>
          <p className="text-foreground"><strong>Address:</strong> ***REDACTED***</p>
        </div>
      )}

      {/* Order Items */}
      <div className="border-t border-border pt-4">
        <h4 className="text-foreground font-semibold mb-2">Order Items</h4>
        {isMobile ? (
          <div className="space-y-3">
            {orderItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No order items found</p>
            ) : (
              orderItems.map((item: any) => (
                <Card key={item.id} className="futuristic-card">
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <p className="text-foreground font-medium">{item.item_name}</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-blue-300">Qty: {item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-blue-300">Unit: {formatCurrency(item.unit_price)}</p>
                        </div>
                        <div>
                          <p className="text-cyan-300 font-semibold">Total: {formatCurrency(item.total_price)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
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
                {orderItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No order items found
                    </TableCell>
                  </TableRow>
                ) : (
                  orderItems.map((item: any) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="text-foreground">{item.item_name}</TableCell>
                      <TableCell className="text-foreground">{item.quantity}</TableCell>
                      <TableCell className="text-foreground">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-foreground font-semibold">{formatCurrency(item.total_price)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Payment Summary */}
      <div className={`${isMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-3 gap-4'} p-4 bg-muted rounded-lg`}>
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Total Amount</p>
          <p className={`text-foreground font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>{formatCurrency(viewingOrder.total_price)}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Total Paid</p>
          <p className={`text-foreground font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>{formatCurrency(viewingOrder.total_paid)}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Balance Due</p>
          <p className={`text-foreground font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>{formatCurrency(viewingOrder.balance_due)}</p>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DrawerContent className="simple-card max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Order Details</DrawerTitle>
            <DrawerDescription>
              {viewingOrder.order_number}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
      <DialogContent className="simple-card max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Order Details - {viewingOrder.order_number}</DialogTitle>
          <DialogDescription>
            Detailed information about the selected order, including customer details, order items, and payment summary.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
