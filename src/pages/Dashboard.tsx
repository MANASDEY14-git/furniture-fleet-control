
import React, { useState, useEffect } from 'react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import WelcomeCard from '@/components/dashboard/WelcomeCard';
import MetricsGrid from '@/components/dashboard/MetricsGrid';
import RecentSalesCard from '@/components/dashboard/RecentSalesCard';
import SalesTrendChart from '@/components/SalesTrendChart';
import TopSellingChart from '@/components/TopSellingChart';
import AlertsPanel from '@/components/AlertsPanel';
import { useStores } from '@/hooks/useStores';
import { useEnhancedDashboardMetrics, type DateFilter } from '@/hooks/useEnhancedDashboardMetrics';
import { useRecentSales } from '@/hooks/useRecentSales';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: stores = [], isLoading: storesLoading } = useStores();
  
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    refetch: refetchMetrics 
  } = useEnhancedDashboardMetrics(dateFilter, customDateRange);
  
  const { data: recentSales = [], isLoading: salesLoading, refetch: refetchSales } = useRecentSales(selectedStore);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      // Also refetch metrics every minute for real-time updates
      refetchMetrics();
    }, 60000);
    
    return () => clearInterval(timer);
  }, [refetchMetrics]);

  // Set up real-time subscriptions with better channel management
  useEffect(() => {
    const channels: any[] = [];

    // Sales real-time updates
    const salesChannel = supabase
      .channel('dashboard-sales-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales'
        },
        () => {
          console.log('Sales data changed, refreshing...');
          refetchMetrics();
          refetchSales();
        }
      )
      .subscribe();
    channels.push(salesChannel);

    // Payments real-time updates
    const paymentsChannel = supabase
      .channel('dashboard-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          console.log('Payments data changed, refreshing...');
          refetchMetrics();
        }
      )
      .subscribe();
    channels.push(paymentsChannel);

    // Items real-time updates
    const itemsChannel = supabase
      .channel('dashboard-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        () => {
          console.log('Items data changed, refreshing...');
          refetchMetrics();
        }
      )
      .subscribe();
    channels.push(itemsChannel);

    // Purchases real-time updates
    const purchasesChannel = supabase
      .channel('dashboard-purchases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases'
        },
        () => {
          console.log('Purchases data changed, refreshing...');
          refetchMetrics();
        }
      )
      .subscribe();
    channels.push(purchasesChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [refetchMetrics, refetchSales]);

  const handleCustomDateRangeChange = (range: { from: Date; to: Date }) => {
    setCustomDateRange(range);
  };

  const isLoading = metricsLoading || salesLoading || storesLoading;

  return (
    <div className="space-y-6">
      <DashboardHeader
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
        stores={stores}
        storesLoading={storesLoading}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        customDateRange={customDateRange}
        onCustomDateRangeChange={handleCustomDateRangeChange}
      />

      <WelcomeCard currentTime={currentTime} />

      {metrics && (
        <MetricsGrid 
          metrics={metrics} 
          dateFilter={dateFilter} 
          isLoading={isLoading} 
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SalesTrendChart data={metrics?.salesTrend || []} />
        <TopSellingChart data={metrics?.topSellingItems || []} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentSalesCard 
            recentSales={recentSales}
            stores={stores}
            isLoading={isLoading}
          />
        </div>

        <AlertsPanel 
          lowStockItems={metrics?.lowStockItems || []}
          pendingDeliveries={metrics?.pendingDeliveries || 0}
        />
      </div>
    </div>
  );
}
