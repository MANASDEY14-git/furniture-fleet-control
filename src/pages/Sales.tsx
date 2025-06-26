
import { useState, useMemo } from 'react';
import { Plus, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import StoreSelector from '@/components/StoreSelector';
import SupplierSelector from '@/components/SupplierSelector';
import SalesOrderForm from '@/components/SalesOrderForm';
import StatusBadge from '@/components/StatusBadge';
import { useSalesOrders, useUpdateSalesOrderStatus } from '@/hooks/useSalesOrders';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import { DeliveryStatus } from '@/types';

export default function Sales() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingOrder, setViewingOrder] = useState<any>(null);

  const { data: salesOrders = [], isLoading: ordersLoading } = useSalesOrders();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const updateOrderStatus = useUpdateSalesOrderStatus();

  const filteredOrders = useMemo(() => {
    return salesOrders.filter(order => {
      const matchesStore = selectedStore === 'all' || order.store_id === selectedStore;
      const matchesSupplier = selectedSupplier === 'all' || order.supplier_id === selectedSupplier;
      const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStore && matchesSupplier && matchesSearch;
    });
  }, [salesOrders, selectedStore, selectedSupplier, searchTerm]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Walk-in Customer';
  };

  const getTotalRevenue = () => {
    return filteredOrders.reduce((sum, order) => sum + order.total_amount, 0);
  };

  const getTotalItems = () => {
    return filteredOrders.reduce((sum, order) => sum + (order.sales_order_items?.length || 0), 0);
  };

  const handleStatusUpdate = (orderId: string, newStatus: DeliveryStatus) => {
    updateOrderStatus.mutate({ id: orderId, delivery_status: newStatus });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Sales Management</h1>
          <p className="text-blue-300">Track sales orders by supplier and outlet with delivery status</p>
        </div>
        <SalesOrderForm
          trigger={
            <Button className="cyber-button text-white font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          }
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <p className="text-sm text-blue-200 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-cyan-300">
                {getTotalItems()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-cyan-300">
                ₹{getTotalRevenue().toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
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
                  <TableHead className="text-blue-200">Store</TableHead>
                  <TableHead className="text-blue-200">Customer</TableHead>
                  <TableHead className="text-right text-blue-200">Total Amount</TableHead>
                  <TableHead className="text-blue-200">Status</TableHead>
                  <TableHead className="text-right text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="text-blue-100">{order.date}</TableCell>
                    <TableCell className="font-medium text-cyan-300">{order.order_number}</TableCell>
                    <TableCell className="text-blue-200">{getStoreName(order.store_id)}</TableCell>
                    <TableCell className="text-blue-200">{getSupplierName(order.supplier_id || '')}</TableCell>
                    <TableCell className="text-right text-cyan-300 font-semibold">₹{order.total_amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Select 
                        value={order.delivery_status} 
                        onValueChange={(value: DeliveryStatus) => handleStatusUpdate(order.id, value)}
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
                        <DialogContent className="futuristic-card max-w-4xl">
                          <DialogHeader>
                            <DialogTitle className="text-cyan-300">Order Details - {order.order_number}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-blue-200"><strong>Store:</strong> {getStoreName(order.store_id)}</p>
                                <p className="text-blue-200"><strong>Customer:</strong> {getSupplierName(order.supplier_id || '')}</p>
                              </div>
                              <div>
                                <p className="text-blue-200"><strong>Date:</strong> {order.date}</p>
                                <p className="text-blue-200"><strong>Status:</strong> <StatusBadge status={order.delivery_status} /></p>
                              </div>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-blue-200 mb-2">Items</h3>
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
                                  {order.sales_order_items?.map((item: any) => (
                                    <TableRow key={item.id} className="border-blue-500/20">
                                      <TableCell className="text-blue-100">{item.item_name}</TableCell>
                                      <TableCell className="text-blue-100">{item.quantity}</TableCell>
                                      <TableCell className="text-blue-100">₹{item.unit_price}</TableCell>
                                      <TableCell className="text-cyan-300 font-semibold">₹{item.total_price}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              <div className="mt-4 text-right">
                                <p className="text-lg font-bold text-cyan-300">
                                  Total: ₹{order.total_amount.toLocaleString('en-IN')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
    </div>
  );
}
