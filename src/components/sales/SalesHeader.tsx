
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EnhancedSalesOrderForm from '@/components/EnhancedSalesOrderForm';
import ExportButton from '@/components/ExportButton';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

interface SalesHeaderProps {
  filteredOrders: any[];
  dateFilter: DateFilter;
  getStoreName: (storeId: string) => string;
  getSupplierName: (supplierId: string) => string;
}

export default function SalesHeader({ 
  filteredOrders, 
  dateFilter, 
  getStoreName, 
  getSupplierName 
}: SalesHeaderProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold glow-text">Sales Management</h1>
          <p className="text-blue-300 text-sm">Track sales orders with advance payments and delivery tracking</p>
        </div>
        <div className="flex flex-col gap-3">
          <EnhancedSalesOrderForm
            trigger={
              <Button className="cyber-button text-white font-semibold w-full h-12">
                <Plus className="w-5 h-5 mr-2" />
                Create Order
              </Button>
            }
          />
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
        </div>
      </div>
    );
  }

  return (
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
  );
}
