
import { Eye, Receipt, ChevronDown, ChevronUp, ArrowRightLeft, Send, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MobileConfirmationDialog } from '@/components/ui/mobile-confirmation-dialog';
import StatusBadge from '@/components/StatusBadge';
import QuoteStatusBadge from '@/components/sales/QuoteStatusBadge';
import { DeliveryStatus } from '@/types';
import { formatCurrency } from '@/utils/currencyUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CancelOrderDialog } from './CancelOrderDialog';
import { useCancelSalesOrder } from '@/hooks/useSalesOrders';
import { useConvertQuoteToOrder } from '@/hooks/useConvertQuoteToOrder';
import { useUpdateQuoteStatus } from '@/hooks/useUpdateQuoteStatus';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SalesTableProps {
  filteredOrders: any[];
  getStoreName: (storeId: string) => string;
  getSupplierName: (supplierId: string) => string;
  handleStatusUpdate: (orderId: string, newStatus: DeliveryStatus) => void;
  setViewingOrder: (order: any) => void;
  setRecordingPayment: (order: any) => void;
  canAccessPII?: boolean;
  documentType?: 'order' | 'quote';
  onConvertSuccess?: () => void;
}

// Mobile Order Card Component
function MobileOrderCard({ 
  order, 
  getStoreName, 
  getSupplierName, 
  handleStatusChange, 
  setViewingOrder, 
  setRecordingPayment, 
  canAccessPII,
  documentType,
  onConvertQuote,
  isConverting,
  isHighlighted,
  onUpdateQuoteStatus,
  isUpdatingQuoteStatus
}: { 
  order: any;
  getStoreName: (storeId: string) => string;
  getSupplierName: (supplierId: string) => string;
  handleStatusChange: (orderId: string, newStatus: DeliveryStatus, order: any) => void;
  setViewingOrder: (order: any) => void;
  setRecordingPayment: (order: any) => void;
  canAccessPII: boolean;
  documentType: 'order' | 'quote';
  onConvertQuote?: (orderId: string) => void;
  isConverting?: boolean;
  isHighlighted?: boolean;
  onUpdateQuoteStatus?: (orderId: string, status: string) => void;
  isUpdatingQuoteStatus?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className={cn("mb-3 transition-all duration-500", isHighlighted && "ring-2 ring-primary/50 bg-primary/5")}>
      <CardContent className="p-4">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{order.order_number}</span>
                  {documentType === 'quote' && <QuoteStatusBadge status={order.quote_status} />}
                </div>
                <div className="flex items-center gap-2">
                  {order.balance_due > 0 ? (
                    <span className="text-amber-600 font-semibold text-sm">{formatCurrency(order.balance_due)}</span>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Paid</Badge>
                  )}
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
              
              <div className="space-y-1 text-sm">
                <p className="text-gray-500">
                  {canAccessPII && order.customer_name && order.customer_name !== '***REDACTED***' 
                    ? order.customer_name 
                    : (order.customer_name === '***REDACTED***' 
                      ? '***REDACTED***' 
                      : getSupplierName(order.supplier_id || ''))}
                </p>
                <p className="text-gray-400">{new Date(order.sale_date).toLocaleDateString('en-GB')}</p>
                <p className="text-gray-900 font-semibold">{formatCurrency(order.total_price)}</p>
              </div>
            </div>
          </div>

          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t border-border/40 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground font-medium">Store</p>
                  <p className="text-foreground">{getStoreName(order.store_id)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Delivery</p>
                  <p className="text-foreground">
                    {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : 'Not Set'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Paid</p>
                  <p className="text-emerald-600 font-semibold">{formatCurrency(order.total_paid)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Status</p>
                  <StatusBadge status={order.delivery_status} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground font-medium text-sm">Update Status</p>
                <Select 
                  value={order.delivery_status} 
                  onValueChange={(value: DeliveryStatus) => handleStatusChange(order.sale_id, value, order)}
                  disabled={order.delivery_status === 'Cancelled'}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      <StatusBadge status={order.delivery_status} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DeliveryStatus.Pending}>Pending</SelectItem>
                    <SelectItem value={DeliveryStatus.PaidInFull}>Paid in Full</SelectItem>
                    <SelectItem value={DeliveryStatus.Delivered}>Delivered</SelectItem>
                    <SelectItem value={DeliveryStatus.Shipped}>Shipped</SelectItem>
                    <SelectItem value={DeliveryStatus.Cancelled}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {documentType === 'quote' && onConvertQuote ? (
                  <>
                    {/* Quote lifecycle actions */}
                    {onUpdateQuoteStatus && order.quote_status !== 'accepted' && order.quote_status !== 'rejected' && (
                      <div className="flex gap-2">
                        {order.quote_status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            disabled={isUpdatingQuoteStatus}
                            onClick={() => onUpdateQuoteStatus(order.sale_id, 'sent')}
                          >
                            <Send className="w-4 h-4 mr-1.5" />
                            Mark Sent
                          </Button>
                        )}
                        {(order.quote_status === 'draft' || order.quote_status === 'sent') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              disabled={isUpdatingQuoteStatus}
                              onClick={() => onUpdateQuoteStatus(order.sale_id, 'accepted')}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1.5" />
                              Accept
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                              disabled={isUpdatingQuoteStatus}
                              onClick={() => onUpdateQuoteStatus(order.sale_id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4 mr-1.5" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Convert button — only if accepted */}
                    {order.quote_status === 'accepted' && (
                      <>
                        <p className="text-xs text-muted-foreground">Quote accepted. Convert it to confirm the order and start processing.</p>
                        <MobileConfirmationDialog
                          trigger={
                            <Button
                              size="lg"
                              className="w-full bg-primary text-primary-foreground font-bold hover:shadow-md active:scale-95 transition-all"
                              disabled={isConverting}
                            >
                              <ArrowRightLeft className="w-4 h-4 mr-2" />
                              {isConverting ? 'Converting...' : 'Convert to Order'}
                            </Button>
                          }
                          title="Convert to Order"
                          description={`Convert quote ${order.order_number} into a confirmed sales order? All items, pricing, and customer details will be preserved.`}
                          confirmText="Convert to Order"
                          cancelText="Cancel"
                          onConfirm={() => onConvertQuote(order.sale_id)}
                        />
                      </>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setViewingOrder(order)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setViewingOrder(order)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setRecordingPayment(order)}
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      Payment
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export default function SalesTable({
  filteredOrders,
  getStoreName,
  getSupplierName,
  handleStatusUpdate,
  setViewingOrder,
  setRecordingPayment,
  canAccessPII = false,
  documentType = 'order',
  onConvertSuccess
}: SalesTableProps) {
  const isMobile = useIsMobile();
  const [cancellingOrder, setCancellingOrder] = useState<any>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const cancelOrderMutation = useCancelSalesOrder();
  const convertQuoteMutation = useConvertQuoteToOrder();
  const updateQuoteStatusMutation = useUpdateQuoteStatus();

  const handleStatusChange = (orderId: string, newStatus: DeliveryStatus, order: any) => {
    if (newStatus === 'Cancelled') {
      setCancellingOrder(order);
    } else {
      handleStatusUpdate(orderId, newStatus);
    }
  };

  const handleCancelConfirm = (reason: string) => {
    if (cancellingOrder) {
      cancelOrderMutation.mutate({
        orderId: cancellingOrder.sale_id,
        cancellationReason: reason
      });
    }
  };

  const handleConvert = useCallback((orderId: string) => {
    convertQuoteMutation.mutate(orderId, {
      onSuccess: () => {
        setHighlightedOrderId(orderId);
        setTimeout(() => {
          setHighlightedOrderId(null);
          onConvertSuccess?.();
        }, 1500);
      }
    });
  }, [convertQuoteMutation, onConvertSuccess]);

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground font-semibold">Sales Orders ({filteredOrders.length})</h3>
        </div>
        
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">{documentType === 'quote' ? 'No quotes yet. Create a quote to share pricing with customers before confirming orders.' : 'No sales orders found matching your criteria'}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <MobileOrderCard
                key={order.sale_id}
                order={order}
                getStoreName={getStoreName}
                getSupplierName={getSupplierName}
                handleStatusChange={handleStatusChange}
                setViewingOrder={setViewingOrder}
                setRecordingPayment={setRecordingPayment}
                canAccessPII={canAccessPII}
                documentType={documentType}
                onConvertQuote={handleConvert}
                isConverting={convertQuoteMutation.isPending}
                isHighlighted={highlightedOrderId === order.sale_id}
                onUpdateQuoteStatus={(id, status) => updateQuoteStatusMutation.mutate({ orderId: id, quoteStatus: status as any })}
                isUpdatingQuoteStatus={updateQuoteStatusMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gray-900 text-lg font-semibold">Sales Orders ({filteredOrders.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Order #</TableHead>
                {documentType === 'quote' && <TableHead>Quote Status</TableHead>}
                <TableHead>Customer</TableHead>
                <TableHead>Store</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.sale_id} className={cn("transition-all duration-500", highlightedOrderId === order.sale_id && "bg-primary/10 ring-1 ring-primary/30")}>
                  <TableCell className="text-muted-foreground">{new Date(order.sale_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell className="font-semibold text-foreground">{order.order_number}</TableCell>
                  {documentType === 'quote' && (
                    <TableCell><QuoteStatusBadge status={order.quote_status} /></TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {canAccessPII && order.customer_name && order.customer_name !== '***REDACTED***' 
                      ? order.customer_name 
                      : (order.customer_name === '***REDACTED***' 
                        ? '***REDACTED***' 
                        : getSupplierName(order.supplier_id || ''))}
                  </TableCell>
                  <TableCell className="text-gray-500">{getStoreName(order.store_id)}</TableCell>
                  <TableCell className="text-right font-semibold text-gray-900">{formatCurrency(order.total_price)}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">{formatCurrency(order.total_paid)}</TableCell>
                  <TableCell className="text-right">
                    {order.balance_due > 0 ? (
                      <span className="text-amber-600 font-semibold">{formatCurrency(order.balance_due)}</span>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 border-green-200">Paid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : 'Not Set'}
                  </TableCell>
                   <TableCell>
                    <Select 
                      value={order.delivery_status} 
                      onValueChange={(value: DeliveryStatus) => handleStatusChange(order.sale_id, value, order)}
                      disabled={order.delivery_status === 'Cancelled'}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue>
                          <StatusBadge status={order.delivery_status} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={DeliveryStatus.Pending}>Pending</SelectItem>
                        <SelectItem value={DeliveryStatus.PaidInFull}>Paid in Full</SelectItem>
                        <SelectItem value={DeliveryStatus.Delivered}>Delivered</SelectItem>
                        <SelectItem value={DeliveryStatus.Shipped}>Shipped</SelectItem>
                        <SelectItem value={DeliveryStatus.Cancelled}>Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end items-center">
                      {documentType === 'quote' && (
                        <>
                          {/* Quote lifecycle dropdown */}
                          {order.quote_status !== 'accepted' && order.quote_status !== 'rejected' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" disabled={updateQuoteStatusMutation.isPending}>
                                  Update Status
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {order.quote_status === 'draft' && (
                                  <DropdownMenuItem onClick={() => updateQuoteStatusMutation.mutate({ orderId: order.sale_id, quoteStatus: 'sent' })}>
                                    <Send className="w-4 h-4 mr-2" />
                                    Mark as Sent
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => updateQuoteStatusMutation.mutate({ orderId: order.sale_id, quoteStatus: 'accepted' })}>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Mark as Accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateQuoteStatusMutation.mutate({ orderId: order.sale_id, quoteStatus: 'rejected' })}>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Mark as Rejected
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          {/* Convert — only if accepted */}
                          {order.quote_status === 'accepted' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="bg-primary text-primary-foreground font-bold px-4 py-2 hover:shadow-md active:scale-95 transition-all"
                                  disabled={convertQuoteMutation.isPending}
                                >
                                  <ArrowRightLeft className="w-4 h-4 mr-1.5" />
                                  {convertQuoteMutation.isPending ? 'Converting...' : 'Convert to Order'}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Convert to Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Convert quote <span className="font-semibold text-foreground">{order.order_number}</span> into a confirmed sales order? All items, pricing, and customer details will be preserved.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleConvert(order.sale_id)}>
                                    Convert to Order
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </>
                      )}

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => setViewingOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {documentType === 'order' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-emerald-600"
                          onClick={() => setRecordingPayment(order)}
                        >
                          <Receipt className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredOrders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{documentType === 'quote' ? 'No quotes yet. Create a quote to share pricing with customers before confirming orders.' : 'No sales orders found matching your criteria'}</p>
          </div>
        )}
      </CardContent>
      
      <CancelOrderDialog
        open={!!cancellingOrder}
        onOpenChange={(open) => !open && setCancellingOrder(null)}
        onConfirm={handleCancelConfirm}
        orderNumber={cancellingOrder?.order_number || ''}
        itemCount={cancellingOrder?.sales_order_items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0}
      />
    </Card>
  );
}
