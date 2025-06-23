
import React, { useState, useEffect } from 'react';
import { DollarSign, Package, ShoppingCart, Truck, Clock, Calendar } from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import StoreSelector from '@/components/StoreSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStores } from '@/hooks/useStores';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useRecentSales } from '@/hooks/useRecentSales';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useDashboardMetrics(selectedStore);
  const { data: recentSales = [], isLoading: salesLoading, refetch: refetchSales } = useRecentSales(selectedStore);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    const salesChannel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales'
        },
        () => {
          refetchMetrics();
          refetchSales();
        }
      )
      .subscribe();

    const paymentsChannel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          refetchMetrics();
        }
      )
      .subscribe();

    const itemsChannel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        () => {
          refetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [refetchMetrics, refetchSales]);

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

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getTimeOfDay = (date: Date): string => {
    const hours = date.getHours();
    if (hours < 12) return 'Morning';
    if (hours < 18) return 'Afternoon';
    return 'Evening';
  };

  const isLoading = metricsLoading || salesLoading || storesLoading;

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
          isLoading={storesLoading}
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
          value={isLoading ? "Loading..." : `$${(metrics?.totalSalesToday || 0).toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          description="+20.1% from yesterday"
        />
        <MetricCard
          title="Inventory Value"
          value={isLoading ? "Loading..." : `$${(metrics?.totalStockValue || 0).toLocaleString()}`}
          icon={<Package className="w-5 h-5" />}
          description="+5 items this week"
        />
        <MetricCard
          title="Payments Received"
          value={isLoading ? "Loading..." : `$${(metrics?.paymentsReceived || 0).toLocaleString()}`}
          icon={<ShoppingCart className="w-5 h-5" />}
          description="+12% from yesterday"
        />
        <MetricCard
          title="Pending Deliveries"
          value={isLoading ? "Loading..." : (metrics?.pendingDeliveries || 0).toString()}
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
            {isLoading ? (
              <p className="text-center text-gray-500 py-4">Loading...</p>
            ) : recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{sale.item_name}</p>
                    <p className="text-sm text-gray-500">{getStoreName(sale.store_id)} • {sale.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${Number(sale.total_price).toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Qty: {sale.quantity}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No recent sales</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
