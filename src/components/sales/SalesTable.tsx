
import { Eye, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/StatusBadge';
import { DeliveryStatus } from '@/types';
import { formatCurrency } from '@/utils/currencyUtils';

interface SalesTableProps {
  filteredOrders: any[];
  getStoreName: (storeId: string) => string;
  getSupplierName: (supplierId: string) => string;
  handleStatusUpdate: (orderId: string, newStatus: DeliveryStatus) => void;
  setViewingOrder: (order: any) => void;
  setRecordingPayment: (order: any) => void;
}

export default function SalesTable({
  filteredOrders,
  getStoreName,
  getSupplierName,
  handleStatusUpdate,
  setViewingOrder,
  setRecordingPayment
}: SalesTableProps) {
  return (
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
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                        onClick={() => setViewingOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
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
  );
}
