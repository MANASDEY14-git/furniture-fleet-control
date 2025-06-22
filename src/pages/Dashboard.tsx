
import { useState, useMemo } from 'react';
import { DollarSign, Package, ShoppingCart, Truck } from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import StoreSelector from '@/components/StoreSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sales, payments, items, stores } from '@/data/mockData';
import { DashboardMetrics } from '@/types';

export default function Dashboard() {
  const [selectedStore, setSelectedStore] = useState('all');

  const metrics: DashboardMetrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const filteredSales = selectedStore === 'all' 
      ? sales 
      : sales.filter(sale => sale.storeId === selectedStore);
    
    const filteredPayments = selectedStore === 'all'
      ? payments
      : payments.filter(payment => payment.storeId === selectedStore);
    
    const filteredItems = selectedStore === 'all'
      ? items
      : items.filter(item => item.storeId === selectedStore);

    const totalSalesToday = filteredSales
      .filter(sale => sale.date === today)
      .reduce((sum, sale) => sum + sale.totalPrice, 0);

    const totalStockValue = filteredItems
      .reduce((sum, item) => sum + (item.quantityAvailable * item.costPrice), 0);

    const paymentsReceived = filteredPayments
      .filter(payment => payment.type === 'Receipt' && payment.date === today)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const pendingDeliveries = filteredSales
      .filter(sale => sale.deliveryStatus === 'Pending').length;

    return {
      totalSalesToday,
      totalStockValue,
      paymentsReceived,
      pendingDeliveries,
    };
  }, [selectedStore]);

  const recentSales = useMemo(() => {
    const filtered = selectedStore === 'all' 
      ? sales 
      : sales.filter(sale => sale.storeId === selectedStore);
    
    return filtered
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [selectedStore]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your furniture stores</p>
        </div>
        <StoreSelector 
          value={selectedStore} 
          onValueChange={setSelectedStore}
          placeholder="Select store"
        />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales Today"
          value={`$${metrics.totalSalesToday.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          trend={{ value: 12, label: 'from yesterday' }}
        />
        <MetricCard
          title="Total Stock Value"
          value={`$${metrics.totalStockValue.toLocaleString()}`}
          icon={<Package className="w-5 h-5" />}
          trend={{ value: -2, label: 'from last week' }}
        />
        <MetricCard
          title="Payments Received"
          value={`$${metrics.paymentsReceived.toLocaleString()}`}
          icon={<ShoppingCart className="w-5 h-5" />}
          trend={{ value: 8, label: 'from yesterday' }}
        />
        <MetricCard
          title="Pending Deliveries"
          value={metrics.pendingDeliveries}
          icon={<Truck className="w-5 h-5" />}
        />
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{sale.itemName}</p>
                  <p className="text-sm text-gray-500">{getStoreName(sale.storeId)} • {sale.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">${sale.totalPrice}</p>
                  <p className="text-sm text-gray-500">Qty: {sale.quantity}</p>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <p className="text-center text-gray-500 py-4">No recent sales</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
