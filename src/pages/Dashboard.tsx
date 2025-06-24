
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
