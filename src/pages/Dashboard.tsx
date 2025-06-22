
import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, Package, ShoppingCart, Truck, Clock, Calendar } from 'lucide-react';
import type { Store } from '@/types';
import MetricCard from '@/components/MetricCard';
import StoreSelector from '@/components/StoreSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sales, payments, items, stores } from '@/data/mockData';
import { DashboardMetrics } from '@/types';

export default function Dashboard() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your store.
          </p>
        </div>
        <StoreSelector 
          value={selectedStore}
          onValueChange={setSelectedStore}
          stores={stores}
          placeholder="Select store"
        />
      </div>

      {/* Welcome Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Good {getTimeOfDay(currentTime)},</h2>
              <p className="text-muted-foreground">Here's your daily overview</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formattedTime}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Today's Sales"
          value={`$${metrics.totalSalesToday.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          description="+20.1% from yesterday"
        />
        <MetricCard
          title="Inventory Value"
          value={`$${metrics.totalStockValue.toLocaleString()}`}
          icon={<Package className="w-5 h-5" />}
          description="+5 items this week"
        />
        <MetricCard
          title="Payments Received"
          value={`$${metrics.paymentsReceived.toLocaleString()}`}
          icon={<ShoppingCart className="w-5 h-5" />}
          description="+12% from yesterday"
        />
        <MetricCard
          title="Pending Deliveries"
          value={metrics.pendingDeliveries.toString()}
          icon={<Truck className="w-5 h-5" />}
          description="+2 from yesterday"
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

// Helper function to get time of day greeting
function getTimeOfDay(date: Date): string {
  const hours = date.getHours();
  if (hours < 12) return 'Morning';
  if (hours < 18) return 'Afternoon';
  return 'Evening';
}
