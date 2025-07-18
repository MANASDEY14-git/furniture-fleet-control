
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSingleSalesOrder } from '@/hooks/useSingleSalesOrder';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency } from '@/utils/currencyUtils';
import { useItemVariantsForOrderItems } from '@/hooks/useItemVariantsForOrderItems';
import { getVariantDisplayName } from './OrderDetailsDialogVariantUtils';

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
  if (!viewingOrder) {
    // Always return a valid React element for React 18+ strict mode
    return (
      <Dialog open={false}>
        <DialogContent className="futuristic-card max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-cyan-300">Order Details</DialogTitle>
            <DialogDescription>
              No order selected.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // Use id or sale_id for fetching
  const orderId = viewingOrder.id || viewingOrder.sale_id;
  const { data: order, isLoading, error } = useSingleSalesOrder(orderId);
  const orderItems = order?.sales_order_items || [];

  if (isLoading) {
    return (
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="futuristic-card max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-cyan-300">Loading Order...</DialogTitle>
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
        <DialogContent className="futuristic-card max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-cyan-300">Error</DialogTitle>
            <DialogDescription>
              Failed to load order details. Please try again.
            </DialogDescription>
          </DialogHeader>
          <div className="text-red-500">Failed to load order details. Please try again.</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
      <DialogContent className="futuristic-card max-w-6xl">
        <DialogHeader>
          <DialogTitle className="text-cyan-300">Order Details - {viewingOrder.order_number}</DialogTitle>
          <DialogDescription>
            Detailed information about the selected order, including customer details, order items, and payment summary.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-blue-200"><strong>Customer:</strong> {viewingOrder.customer_name || 'Walk-in'}</p>
              <p className="text-blue-200"><strong>Phone:</strong> {viewingOrder.customer_phone || 'N/A'}</p>
              <p className="text-blue-200"><strong>Store:</strong> {getStoreName(viewingOrder.store_id)}</p>
            </div>
            <div>
              <p className="text-blue-200"><strong>Date:</strong> {new Date(viewingOrder.sale_date).toLocaleDateString('en-GB')}</p>
              <p className="text-blue-200"><strong>Status:</strong> <StatusBadge status={viewingOrder.delivery_status} /></p>
              <p className="text-blue-200"><strong>Delivery:</strong> {viewingOrder.delivery_date ? new Date(viewingOrder.delivery_date).toLocaleDateString('en-GB') : 'Not Set'}</p>
            </div>
          </div>
          {viewingOrder.customer_address && (
            <div>
              <p className="text-blue-200"><strong>Address:</strong></p>
              <p className="text-blue-100 ml-4">{viewingOrder.customer_address}</p>
            </div>
          )}

          {/* Order Items */}
          <div className="border-t border-blue-500/30 pt-4">
            <h4 className="text-blue-200 font-semibold mb-2">Order Items</h4>
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Item</TableHead>
                    <TableHead className="text-blue-200">Variant</TableHead>
                    <TableHead className="text-blue-200">Quantity</TableHead>
                    <TableHead className="text-blue-200">Unit Price</TableHead>
                    <TableHead className="text-blue-200">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Use the new fetched orderItems
                    const variantIds = orderItems.map((item: any) => item.variant_id).filter(Boolean);
                    const { data: variantsMap, isLoading: variantsLoading } = useItemVariantsForOrderItems(variantIds);
                    return orderItems.map((item: any) => {
                      let variantCell = null;
                      if (item.variant_id && variantsMap && variantsMap[item.variant_id]) {
                        const variant = variantsMap[item.variant_id];
                        variantCell = (
                          <div>
                            <div className="text-xs text-blue-300">{getVariantDisplayName(variant)}</div>
                            <div className="text-xs text-blue-400">SKU: <span className="font-mono">{variant.sku || 'N/A'}</span></div>
                          </div>
                        );
                      } else if (item.variant_id) {
                        variantCell = <span className="text-xs text-gray-500">Loading...</span>;
                      } else {
                        variantCell = <span className="text-xs text-gray-400">-</span>;
                      }
                      return (
                        <TableRow key={item.id} className="border-blue-500/20">
                          <TableCell className="text-blue-200">{item.item_name}</TableCell>
                          <TableCell>{variantCell}</TableCell>
                          <TableCell className="text-blue-200">{item.quantity}</TableCell>
                          <TableCell className="text-blue-200">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-cyan-300 font-semibold">{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/30 rounded-lg">
            <div className="text-center">
              <p className="text-blue-200 text-sm">Total Amount</p>
              <p className="text-cyan-300 font-bold text-lg">{formatCurrency(viewingOrder.total_price)}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-200 text-sm">Total Paid</p>
              <p className="text-green-400 font-bold text-lg">{formatCurrency(viewingOrder.total_paid)}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-200 text-sm">Balance Due</p>
              <p className="text-orange-400 font-bold text-lg">{formatCurrency(viewingOrder.balance_due)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
