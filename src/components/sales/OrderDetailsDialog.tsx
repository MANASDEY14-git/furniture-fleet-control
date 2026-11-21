import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSingleSalesOrder, SalesOrderItem } from '@/hooks/useSingleSalesOrder';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useCurrentUserRole } from '@/hooks/useCurrentUserRole';
import { useModifySalesOrderLine } from '@/hooks/useSalesOrders';
import { useItems } from '@/hooks/useItems';
import { useItemVariants } from '@/hooks/useItemVariants';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/StatusBadge';
import ProductionTab from '@/components/sales/ProductionTab';
import { formatCurrency } from '@/utils/currencyUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertTriangle, Plus, Trash2, History, Lock, User, Clock, ShieldAlert } from 'lucide-react';
import { useOrderBOMSnapshots } from '@/hooks/useOrderProductionData';

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
  const orderId = viewingOrder?.sale_id || null;
  const { data: order, isLoading, error } = useSingleSalesOrder(orderId);
  const { data: suppliers = [] } = useSuppliers();
  const { data: bomSnapshots = [] } = useOrderBOMSnapshots(orderId);
  const { data: userRole } = useCurrentUserRole();
  const modifyLineMutation = useModifySalesOrderLine();

  const isAdminOrManager = Boolean(userRole?.isAdmin || userRole?.isManager);

  // Store items for adding lines
  const storeId = order?.store_id || viewingOrder?.store_id;
  const { data: availableItems = [] } = useItems(storeId);

  // Dialog states for Add / Remove item
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [addUnitPrice, setAddUnitPrice] = useState<number>(0);

  // Variants for the currently selected item in the Add dialog
  const { data: itemVariants = [] } = useItemVariants(selectedItemId || undefined);

  // Remove confirmation state
  const [itemToRemove, setItemToRemove] = useState<SalesOrderItem | null>(null);
  const [removalReason, setRemovalReason] = useState<string>('');

  const hasBOMItems = bomSnapshots.length > 0;
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const defaultTab = hasBOMItems ? 'production' : 'overview';
  const currentTab = activeTab || defaultTab;

  const orderItems: SalesOrderItem[] = (order?.sales_order_items as SalesOrderItem[]) || [];

  const activeItems = useMemo(() => {
    return orderItems.filter(item => !item.is_removed);
  }, [orderItems]);

  const removedItems = useMemo(() => {
    return orderItems.filter(item => Boolean(item.is_removed));
  }, [orderItems]);

  const isDelivered = (order?.delivery_status || viewingOrder?.delivery_status) === 'Delivered';
  const isCancelled = (order?.delivery_status || viewingOrder?.delivery_status) === 'Cancelled' || order?.status === 'cancelled';
  const canModifyOrder = !isDelivered && !isCancelled;

  const getSupplierName = (supplierId: string | null) => {
    if (!supplierId) return null;
    return suppliers.find(s => s.id === supplierId)?.name || null;
  };

  // Handle Item selection in Add Dialog
  const handleSelectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setSelectedVariantId('');
    const found = availableItems.find(i => i.id === itemId);
    if (found) {
      setAddUnitPrice(Number(found.selling_price) || 0);
    }
  };

  // Handle Variant selection in Add Dialog
  const handleSelectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    const variant = itemVariants.find(v => v.id === variantId);
    if (variant && variant.selling_price) {
      setAddUnitPrice(Number(variant.selling_price));
    }
  };

  const handleOpenAddModal = () => {
    setSelectedItemId('');
    setSelectedVariantId('');
    setAddQuantity(1);
    setAddUnitPrice(0);
    setIsAddModalOpen(true);
  };

  const handleConfirmAdd = async () => {
    if (!selectedItemId || addQuantity <= 0 || addUnitPrice < 0) return;
    const item = availableItems.find(i => i.id === selectedItemId);
    if (!item) return;

    try {
      await modifyLineMutation.mutateAsync({
        orderId: order?.id || orderId,
        action: 'add',
        itemId: item.id,
        itemName: item.name,
        variantId: selectedVariantId || null,
        supplierId: item.supplier_id || null,
        quantity: addQuantity,
        unitPrice: addUnitPrice,
      });
      setIsAddModalOpen(false);
    } catch {
      // Error is handled in mutation hook toast
    }
  };

  const handleOpenRemoveModal = (item: SalesOrderItem) => {
    setItemToRemove(item);
    setRemovalReason('');
  };

  const handleConfirmRemove = async () => {
    if (!itemToRemove || !removalReason.trim()) return;

    try {
      await modifyLineMutation.mutateAsync({
        orderId: order?.id || orderId,
        action: 'remove',
        orderLineId: itemToRemove.id,
        reason: removalReason.trim(),
      });
      setItemToRemove(null);
      setRemovalReason('');
    } catch {
      // Error is handled in mutation hook toast
    }
  };

  if (!viewingOrder) return null;

  if (isLoading) {
    const LoadingContent = () => (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <Drawer open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-foreground">Loading Order...</DrawerTitle>
              <DrawerDescription>Loading order details. Please wait.</DrawerDescription>
            </DrawerHeader>
            <div className="p-4"><LoadingContent /></div>
          </DrawerContent>
        </Drawer>
      );
    }
    return (
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">Loading Order...</DialogTitle>
            <DialogDescription>Loading order details. Please wait.</DialogDescription>
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
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-foreground">{error ? 'Error' : 'Order Not Found'}</DrawerTitle>
              <DrawerDescription>{error ? 'Failed to load order details.' : 'The selected order could not be found.'}</DrawerDescription>
            </DrawerHeader>
            <div className="p-4"><ErrorContent /></div>
          </DrawerContent>
        </Drawer>
      );
    }
    return (
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{error ? 'Error' : 'Order Not Found'}</DialogTitle>
            <DialogDescription>{error ? 'Failed to load order details.' : 'The selected order could not be found.'}</DialogDescription>
          </DialogHeader>
          <ErrorContent />
        </DialogContent>
      </Dialog>
    );
  }

  const OverviewContent = () => (
    <div className="space-y-4">
      {order.delivery_status === 'Cancelled' && order.cancelled_at && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="ml-2">
            <p className="font-semibold text-destructive">This order was cancelled</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cancelled on: {new Date(order.cancelled_at).toLocaleString('en-GB')}
            </p>
            {order.cancellation_reason && (
              <p className="text-sm mt-2"><span className="font-medium">Reason:</span> {order.cancellation_reason}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isDelivered && (
        <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300">
          <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="ml-2">
            <span className="font-semibold">Order Delivered:</span> Item modifications are locked for delivered orders.
          </AlertDescription>
        </Alert>
      )}

      {isMobile ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Customer</p>
                <p className="text-foreground">{canAccessPII && viewingOrder.customer_name && viewingOrder.customer_name !== '***REDACTED***' ? viewingOrder.customer_name : (viewingOrder.customer_name === '***REDACTED***' ? '***REDACTED***' : 'Walk-in')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Sales Person</p>
                <p className="text-purple-600 font-semibold">{order.salesperson_name || viewingOrder.salesperson_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Phone</p>
                <p className="text-foreground">{canAccessPII && viewingOrder.customer_phone && viewingOrder.customer_phone !== '***REDACTED***' ? viewingOrder.customer_phone : (viewingOrder.customer_phone === '***REDACTED***' ? '***REDACTED***' : 'N/A')}</p>
              </div>
              {canAccessPII && order?.customer_phone_2 && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Additional Phone</p>
                  <p className="text-foreground">{order.customer_phone_2}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground font-medium">Store</p>
                <p className="text-foreground">{getStoreName(viewingOrder.store_id)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Date</p>
                <p className="text-foreground">{new Date(viewingOrder.sale_date).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Status</p>
                <StatusBadge status={viewingOrder.delivery_status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Delivery</p>
                <p className="text-foreground">{viewingOrder.delivery_date ? new Date(viewingOrder.delivery_date).toLocaleDateString('en-GB') : 'Not Set'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-foreground"><strong>Customer:</strong> {canAccessPII && viewingOrder.customer_name && viewingOrder.customer_name !== '***REDACTED***' ? viewingOrder.customer_name : (viewingOrder.customer_name === '***REDACTED***' ? '***REDACTED***' : 'Walk-in')}</p>
            <p className="text-foreground"><strong>Phone:</strong> {canAccessPII && viewingOrder.customer_phone && viewingOrder.customer_phone !== '***REDACTED***' ? viewingOrder.customer_phone : (viewingOrder.customer_phone === '***REDACTED***' ? '***REDACTED***' : 'N/A')}</p>
            {canAccessPII && order?.customer_phone_2 && <p className="text-foreground"><strong>Additional Phone:</strong> {order.customer_phone_2}</p>}
            <p className="text-foreground"><strong>Sales Person:</strong> <span className="text-purple-600 font-semibold">{order.salesperson_name || viewingOrder.salesperson_name || 'N/A'}</span></p>
            <p className="text-foreground"><strong>Store:</strong> {getStoreName(viewingOrder.store_id)}</p>
          </div>
          <div>
            <p className="text-foreground"><strong>Date:</strong> {new Date(viewingOrder.sale_date).toLocaleDateString('en-GB')}</p>
            <p className="text-foreground"><strong>Status:</strong> <StatusBadge status={viewingOrder.delivery_status} /></p>
            <p className="text-foreground"><strong>Delivery:</strong> {viewingOrder.delivery_date ? new Date(viewingOrder.delivery_date).toLocaleDateString('en-GB') : 'Not Set'}</p>
          </div>
        </div>
      )}

      {canAccessPII && viewingOrder.customer_address && viewingOrder.customer_address !== '***REDACTED***' && (
        <div>
          <p className="text-foreground"><strong>Address:</strong></p>
          <p className="text-muted-foreground ml-4">{viewingOrder.customer_address}</p>
        </div>
      )}
      {!canAccessPII && viewingOrder.customer_address === '***REDACTED***' && (
        <div><p className="text-foreground"><strong>Address:</strong> ***REDACTED***</p></div>
      )}
    </div>
  );

  const ItemsContent = () => (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Active Order Items ({activeItems.length})</h4>
          <p className="text-xs text-muted-foreground">Items scheduled for delivery and included in order totals.</p>
        </div>

        {canModifyOrder && (
          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5"
            disabled={modifyLineMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            <span>Add Item</span>
          </Button>
        )}
      </div>

      {/* Active Items Table / Mobile Cards */}
      {isMobile ? (
        <div className="space-y-3">
          {activeItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No active items in this order</p>
          ) : (
            activeItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-foreground font-medium">{item.item_name}</p>
                        {item.variant_name && (
                          <Badge variant="secondary" className="text-xs">
                            {item.variant_name}
                          </Badge>
                        )}
                        {item.supplier_id && getSupplierName(item.supplier_id) && (
                          <Badge variant="outline" className="text-xs">{getSupplierName(item.supplier_id)}</Badge>
                        )}
                      </div>
                      {canModifyOrder && (
                        isAdminOrManager ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                            onClick={() => handleOpenRemoveModal(item)}
                            disabled={modifyLineMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Manager req.</span>
                        )
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><p className="text-muted-foreground">Qty: {item.quantity}</p></div>
                      <div><p className="text-muted-foreground">Unit: {formatCurrency(item.unit_price)}</p></div>
                      <div><p className="text-foreground font-semibold">Total: {formatCurrency(item.total_price)}</p></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground">Item</TableHead>
                <TableHead className="text-muted-foreground">Variant</TableHead>
                <TableHead className="text-muted-foreground">Supplier</TableHead>
                <TableHead className="text-right text-muted-foreground">Quantity</TableHead>
                <TableHead className="text-right text-muted-foreground">Unit Price</TableHead>
                <TableHead className="text-right text-muted-foreground">Total</TableHead>
                {canModifyOrder && (
                  <TableHead className="text-center text-muted-foreground w-[100px]">Action</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canModifyOrder ? 7 : 6} className="text-center text-muted-foreground py-8">
                    No active items in this order
                  </TableCell>
                </TableRow>
              ) : (
                activeItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-foreground font-medium">{item.item_name}</TableCell>
                    <TableCell className="text-foreground">
                      {item.variant_name ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {item.variant_name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {item.supplier_id && getSupplierName(item.supplier_id) ? (
                        <Badge variant="outline" className="text-xs">{getSupplierName(item.supplier_id)}</Badge>
                      ) : <span className="text-muted-foreground text-xs">-</span>}
                    </TableCell>
                    <TableCell className="text-right text-foreground">{item.quantity}</TableCell>
                    <TableCell className="text-right text-foreground">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right text-foreground font-semibold">{formatCurrency(item.total_price)}</TableCell>
                    {canModifyOrder && (
                      <TableCell className="text-center">
                        {isAdminOrManager ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 mx-auto"
                            onClick={() => handleOpenRemoveModal(item)}
                            title="Remove item from order"
                            disabled={modifyLineMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground" title="Only admins or managers can remove items">
                            Manager only
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Removed Items History Section */}
      {removedItems.length > 0 && (
        <Card className="border-border/60 bg-muted/20">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Removed Items History ({removedItems.length})
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              Soft Deleted (Preserved for Audit)
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs text-muted-foreground">Item</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Variant</TableHead>
                    <TableHead className="text-xs text-right text-muted-foreground">Qty</TableHead>
                    <TableHead className="text-xs text-right text-muted-foreground">Orig. Total</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Removed By</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Date</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {removedItems.map((item) => (
                    <TableRow key={item.id} className="text-muted-foreground">
                      <TableCell className="line-through text-sm">{item.item_name}</TableCell>
                      <TableCell className="text-xs">{item.variant_name || '-'}</TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(item.total_price)}</TableCell>
                      <TableCell className="text-xs">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {item.remover_name || 'Authorized Staff'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {item.removed_at ? new Date(item.removed_at).toLocaleDateString('en-GB') : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground max-w-[200px] truncate" title={item.removal_reason || ''}>
                        {item.removal_reason || 'No reason specified'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const PaymentsContent = () => {
    const roundOff = Number(order?.round_off ?? viewingOrder?.round_off ?? 0);
    const totalAmount = Number(order?.total_amount ?? viewingOrder?.total_price ?? 0);
    const totalPaid = Number(viewingOrder?.total_paid ?? 0);
    const balanceDue = Number(order?.balance_due ?? (totalAmount - totalPaid));

    return (
      <div className="space-y-4">
        {roundOff !== 0 && (
          <div className="flex justify-between items-center text-sm px-4 py-2 bg-muted/50 rounded-lg">
            <span className="text-muted-foreground">Round Off</span>
            <span className="font-medium text-foreground">{formatCurrency(roundOff)}</span>
          </div>
        )}
        <div className={`${isMobile ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-3 gap-4'} p-4 bg-muted rounded-lg`}>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Total Amount</p>
            <p className={`text-foreground font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>{formatCurrency(totalAmount)}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Total Paid</p>
            <p className={`text-foreground font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>{formatCurrency(totalPaid)}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Balance Due</p>
            <p className={`text-foreground font-bold ${isMobile ? 'text-base' : 'text-lg'} ${balanceDue < 0 ? 'text-emerald-600' : ''}`}>
              {formatCurrency(balanceDue)}
            </p>
            {balanceDue < 0 && (
              <p className="text-xs text-emerald-600 font-medium mt-0.5">Customer Credit Available</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const tabbedContent = (
    <Tabs value={currentTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={`w-full ${isMobile ? 'grid grid-cols-4' : ''}`}>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="production">Production</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><OverviewContent /></TabsContent>
      <TabsContent value="items"><ItemsContent /></TabsContent>
      <TabsContent value="production">
        <ProductionTab orderId={orderId!} totalSellingPrice={order?.total_amount || viewingOrder.total_price || 0} />
      </TabsContent>
      <TabsContent value="payments"><PaymentsContent /></TabsContent>
    </Tabs>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle className="text-foreground">Order Details</DrawerTitle>
              <DrawerDescription>{viewingOrder.order_number}</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 overflow-y-auto">
              {tabbedContent}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Order Details - {viewingOrder.order_number}</DialogTitle>
              <DialogDescription>Detailed information about the selected order.</DialogDescription>
            </DialogHeader>
            {tabbedContent}
          </DialogContent>
        </Dialog>
      )}

      {/* Add Item Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Item to Order</DialogTitle>
            <DialogDescription>
              Add an item to order {order?.order_number}. Inventory and material usage will be automatically deducted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="item-select">Select Item *</Label>
              <Select value={selectedItemId} onValueChange={handleSelectItem}>
                <SelectTrigger id="item-select">
                  <SelectValue placeholder="Choose an item..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} {item.brand ? `(${item.brand})` : ''} - Stock: {item.quantity_available ?? 0}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {itemVariants.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="variant-select">Select Variant</Label>
                <Select value={selectedVariantId} onValueChange={handleSelectVariant}>
                  <SelectTrigger id="variant-select">
                    <SelectValue placeholder="Choose a variant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {itemVariants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.variant_name} - Stock: {v.quantity_available ?? 0} ({formatCurrency(v.selling_price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="item-qty">Quantity *</Label>
                <Input
                  id="item-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit-price">Unit Price *</Label>
                <Input
                  id="unit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={addUnitPrice}
                  onChange={(e) => setAddUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
            </div>

            <div className="p-3 bg-muted/60 rounded-md text-sm flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Line Total:</span>
              <span className="text-foreground font-bold text-base">
                {formatCurrency(addQuantity * addUnitPrice)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={modifyLineMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAdd}
              disabled={!selectedItemId || addQuantity <= 0 || modifyLineMutation.isPending}
            >
              {modifyLineMutation.isPending ? 'Adding Item...' : 'Add to Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Item Confirmation Dialog */}
      <Dialog open={!!itemToRemove} onOpenChange={(open) => !open && setItemToRemove(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <DialogTitle className="text-destructive">Confirm Item Removal</DialogTitle>
            </div>
            <DialogDescription>
              This action requires manager or admin authorization. The item will be soft-deleted and preserved in order history.
            </DialogDescription>
          </DialogHeader>

          {itemToRemove && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md space-y-1 text-sm">
                <p className="font-semibold text-foreground">
                  {itemToRemove.item_name}
                  {itemToRemove.variant_name ? ` (${itemToRemove.variant_name})` : ''}
                </p>
                <p className="text-muted-foreground text-xs">
                  Quantity: {itemToRemove.quantity} | Total: {formatCurrency(itemToRemove.total_price)}
                </p>
                <p className="text-xs text-muted-foreground pt-1">
                  Inventory stock and materials will be automatically restored to warehouse.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="removal-reason" className="text-foreground font-medium">
                  Removal Reason * <span className="text-xs text-muted-foreground">(Required for audit trail)</span>
                </Label>
                <Textarea
                  id="removal-reason"
                  placeholder="e.g. Customer changed mind before delivery, item out of stock, replaced with alternative..."
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setItemToRemove(null)}
              disabled={modifyLineMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={!removalReason.trim() || modifyLineMutation.isPending}
            >
              {modifyLineMutation.isPending ? 'Removing...' : 'Confirm Removal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
