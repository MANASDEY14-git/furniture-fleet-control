import { useState, useMemo } from 'react';
import { Plus, Search, Eye, Download, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import StoreSelector from '@/components/StoreSelector';
import SupplierSelector from '@/components/SupplierSelector';
import EnhancedSalesOrderForm from '@/components/EnhancedSalesOrderForm';
import StatusBadge from '@/components/StatusBadge';
import ExportButton from '@/components/ExportButton';
import DateFilterSelector from '@/components/DateFilterSelector';
import { useSalesOrders, useUpdateSalesOrderStatus } from '@/hooks/useSalesOrders';
import { useSalePaymentStatus, useRecordPayment } from '@/hooks/useSalePaymentStatus';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import { DeliveryStatus } from '@/types';
import { formatCurrency } from '@/utils/currencyUtils';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

export default function Sales() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [recordingPayment, setRecordingPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);

  const { data: salesOrders = [], isLoading: ordersLoading } = useSalesOrders();
  const { data: salePaymentStatus = [] } = useSalePaymentStatus();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const updateOrderStatus = useUpdateSalesOrderStatus();
  const recordPayment = useRecordPayment();

  const filteredOrders = useMemo(() => {
    // Use sale payment status data for enhanced information
    let filtered = salePaymentStatus.filter(order => {
      const matchesStore = selectedStore === 'all' || order.store_id === selectedStore;
      const matchesSupplier = selectedSupplier === 'all' || order.supplier_id === selectedSupplier;
      const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStore && matchesSupplier && matchesSearch;
    });

    // Apply date filter
    if (dateFilter !== 'month' || customDateRange) {
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'custom':
          if (!customDateRange) return filtered;
          startDate = customDateRange.from;
          endDate = customDateRange.to;
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.sale_date);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    return filtered;
  }, [salePaymentStatus, selectedStore, selectedSupplier, searchTerm, dateFilter, customDateRange]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Walk-in Customer';
  };

  const getTotalRevenue = () => {
    return filteredOrders.reduce((sum, order) => sum + order.total_price, 0);
  };

  const getTotalPaid = () => {
    return filteredOrders.reduce((sum, order) => sum + order.total_paid, 0);
  };

  const getTotalOutstanding = () => {
    return filteredOrders.reduce((sum, order) => sum + order.balance_due, 0);
  };

  const handleStatusUpdate = (orderId: string, newStatus: DeliveryStatus) => {
    updateOrderStatus.mutate({ id: orderId, delivery_status: newStatus });
  };

  const handleRecordPayment = async () => {
    if (!recordingPayment || !paymentAmount) return;
    
    await recordPayment.mutateAsync({
      sale_id: recordingPayment.sale_id,
      amount: parseFloat(paymentAmount),
      date: new Date().toISOString().split('T')[0],
      description: `Payment for order ${recordingPayment.order_number}`,
      store_id: recordingPayment.store_id,
    });
    
    setRecordingPayment(null);
    setPaymentAmount('');
  };

  const getOrderItems = (saleId: string) => {
    const salesOrder = salesOrders.find(order => order.id === saleId);
    return salesOrder?.sales_order_items || [];
  };

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading sales orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Sales Management</h1>
          <p className="text-blue-300">Track sales orders with advance payments and delivery tracking</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={filteredOrders.map(order => ({
              'Date': new Date(order.sale_date).toLocaleDateString('en-GB'),
              'Order Number': order.order_number,
              'Store': getStoreName(order.store_id),
              'Customer': order.customer_name || getSupplierName(order.supplier_id || ''),
              'Total Amount': order.total_price,
              'Total Paid': order.total_paid,
              'Balance Due': order.balance_due,
              'Status': order.delivery_status,
              'Delivery Date': order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : 'Not Set'
            }))} 
            filename={`sales-orders-${dateFilter}`} 
            type="sales"
          />
          <EnhancedSalesOrderForm
            trigger={
              <Button className="cyber-button text-white font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            }
          />
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-cyan-300">
                {filteredOrders.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-cyan-300">
                {formatCurrency(getTotalRevenue())}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Collected</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(getTotalPaid())}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-orange-400">
                {formatCurrency(getTotalOutstanding())}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              <Input
                placeholder="Search order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>
            <StoreSelector 
              value={selectedStore} 
              onValueChange={setSelectedStore}
              stores={stores}
              isLoading={storesLoading}
              placeholder="All stores"
            />
            <SupplierSelector 
              value={selectedSupplier} 
              onValueChange={setSelectedSupplier}
              placeholder="All suppliers"
            />
            <DateFilterSelector
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Orders Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">Sales Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Date</TableHead>
                  <TableHead className="text-blue-200">Order #</TableHead>
                  <TableHead className="text-blue-200">Customer</TableHead>
                  <TableHead className="text-blue-200">Store</TableHead>
                  <TableHead className="text-right text-blue-200">Total</TableHead>
                  <TableHead className="text-right text-blue-200">Paid</TableHead>
                  <TableHead className="text-right text-blue-200">Balance</TableHead>
                  <TableHead className="text-blue-200">Delivery</TableHead>
                  <TableHead className="text-blue-200">Status</TableHead>
                  <TableHead className="text-right text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.sale_id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="text-blue-100">{new Date(order.sale_date).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell className="font-medium text-cyan-300">{order.order_number}</TableCell>
                    <TableCell className="text-blue-200">
                      {order.customer_name || getSupplierName(order.supplier_id || '')}
                    </TableCell>
                    <TableCell className="text-blue-200">{getStoreName(order.store_id)}</TableCell>
                    <TableCell className="text-right text-cyan-300 font-semibold">{formatCurrency(order.total_price)}</TableCell>
                    <TableCell className="text-right text-green-400 font-semibold">{formatCurrency(order.total_paid)}</TableCell>
                    <TableCell className="text-right">
                      {order.balance_due > 0 ? (
                        <span className="text-orange-400 font-semibold">{formatCurrency(order.balance_due)}</span>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-400">Paid</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-blue-200">
                      {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : 'Not Set'}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={order.delivery_status} 
                        onValueChange={(value: DeliveryStatus) => handleStatusUpdate(order.sale_id, value)}
                      >
                        <SelectTrigger className="w-36 neon-border bg-slate-800/50 text-blue-100">
                          <SelectValue>
                            <StatusBadge status={order.delivery_status} />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-blue-500/30">
                          <SelectItem value={DeliveryStatus.Pending} className="text-blue-100 focus:bg-blue-800/30">Pending</SelectItem>
                          <SelectItem value={DeliveryStatus.PaidInFull} className="text-blue-100 focus:bg-blue-800/30">Paid in Full</SelectItem>
                          <SelectItem value={DeliveryStatus.Delivered} className="text-blue-100 focus:bg-blue-800/30">Delivered</SelectItem>
                          <SelectItem value={DeliveryStatus.Shipped} className="text-blue-100 focus:bg-blue-800/30">Shipped</SelectItem>
                          <SelectItem value={DeliveryStatus.Cancelled} className="text-blue-100 focus:bg-blue-800/30">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                              onClick={() => setViewingOrder(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="futuristic-card max-w-6xl">
                            <DialogHeader>
                              <DialogTitle className="text-cyan-300">Order Details - {order.order_number}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-blue-200"><strong>Customer:</strong> {order.customer_name || 'Walk-in'}</p>
                                  <p className="text-blue-200"><strong>Phone:</strong> {order.customer_phone || 'N/A'}</p>
                                  <p className="text-blue-200"><strong>Store:</strong> {getStoreName(order.store_id)}</p>
                                </div>
                                <div>
                                  <p className="text-blue-200"><strong>Date:</strong> {new Date(order.sale_date).toLocaleDateString('en-GB')}</p>
                                  <p className="text-blue-200"><strong>Status:</strong> <StatusBadge status={order.delivery_status} /></p>
                                  <p className="text-blue-200"><strong>Delivery:</strong> {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : 'Not Set'}</p>
                                </div>
                              </div>
                              {order.customer_address && (
                                <div>
                                  <p className="text-blue-200"><strong>Address:</strong></p>
                                  <p className="text-blue-100 ml-4">{order.customer_address}</p>
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
                                        <TableHead className="text-blue-200">Quantity</TableHead>
                                        <TableHead className="text-blue-200">Unit Price</TableHead>
                                        <TableHead className="text-blue-200">Total</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {getOrderItems(order.sale_id).map((item: any) => (
                                        <TableRow key={item.id} className="border-blue-500/20">
                                          <TableCell className="text-blue-200">{item.item_name}</TableCell>
                                          <TableCell className="text-blue-200">{item.quantity}</TableCell>
                                          <TableCell className="text-blue-200">{formatCurrency(item.unit_price)}</TableCell>
                                          <TableCell className="text-cyan-300 font-semibold">{formatCurrency(item.total_price)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/30 rounded-lg">
                                <div className="text-center">
                                  <p className="text-blue-200 text-sm">Total Amount</p>
                                  <p className="text-cyan-300 font-bold text-lg">{formatCurrency(order.total_price)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-blue-200 text-sm">Total Paid</p>
                                  <p className="text-green-400 font-bold text-lg">{formatCurrency(order.total_paid)}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-blue-200 text-sm">Balance Due</p>
                                  <p className="text-orange-400 font-bold text-lg">{formatCurrency(order.balance_due)}</p>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {order.balance_due > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
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
              <p className="text-blue-300">No sales orders found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={!!recordingPayment} onOpenChange={() => setRecordingPayment(null)}>
        <DialogContent className="futuristic-card">
          <DialogHeader>
            <DialogTitle className="text-cyan-300">Record Payment</DialogTitle>
          </DialogHeader>
          {recordingPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/30 rounded-lg">
                <p className="text-blue-200"><strong>Order:</strong> {recordingPayment.order_number}</p>
                <p className="text-blue-200"><strong>Customer:</strong> {recordingPayment.customer_name || 'Walk-in'}</p>
                <p className="text-blue-200"><strong>Balance Due:</strong> <span className="text-orange-400 font-bold">{formatCurrency(recordingPayment.balance_due)}</span></p>
              </div>
              
              <div className="space-y-2">
                <label className="text-blue-200 font-semibold">Payment Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  max={recordingPayment.balance_due}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="neon-border bg-slate-800/50 text-blue-100"
                  placeholder="Enter payment amount"
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setRecordingPayment(null)}
                  className="border-blue-500/30 text-blue-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  disabled={!paymentAmount || recordPayment.isPending}
                  className="cyber-button text-white"
                >
                  {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
