import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign, AlertTriangle, Users, Truck } from 'lucide-react';
import { useRealDashboardMetrics } from '@/hooks/useRealDashboardMetrics';
import { useSalePaymentStatus } from '@/hooks/useSalePaymentStatus';
import { useStores } from '@/hooks/useStores';
import { formatCurrency } from '@/utils/currencyUtils';
import SalesTrendChart from '@/components/SalesTrendChart';
import TopSellingChart from '@/components/TopSellingChart';
import { useEnhancedDashboardMetrics } from '@/hooks/useEnhancedDashboardMetrics';
import { supabase } from '@/integrations/supabase/client';
export default function RealDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics
  } = useRealDashboardMetrics();
  const {
    data: salePaymentStatus = [],
    refetch: refetchSalePaymentStatus
  } = useSalePaymentStatus();
  const {
    data: stores = []
  } = useStores();
  const {
    data: dashboardMetrics,
    refetch: refetchDashboardMetrics
  } = useEnhancedDashboardMetrics('month');

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    const channels: any[] = [];

    // Subscribe to sales changes
    const salesChannel = supabase.channel('dashboard-sales-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sales_orders'
    }, () => {
      console.log('Sales data changed, refreshing dashboard...');
      refetchMetrics();
      refetchSalePaymentStatus();
      refetchDashboardMetrics();
    }).subscribe();
    channels.push(salesChannel);

    // Subscribe to purchases changes
    const purchasesChannel = supabase.channel('dashboard-purchases-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'purchases'
    }, () => {
      console.log('Purchases data changed, refreshing dashboard...');
      refetchMetrics();
      refetchDashboardMetrics();
    }).subscribe();
    channels.push(purchasesChannel);

    // Subscribe to items changes
    const itemsChannel = supabase.channel('dashboard-items-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'items'
    }, () => {
      console.log('Items data changed, refreshing dashboard...');
      refetchMetrics();
      refetchDashboardMetrics();
    }).subscribe();
    channels.push(itemsChannel);

    // Subscribe to payments changes
    const paymentsChannel = supabase.channel('dashboard-payments-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'payments'
    }, () => {
      console.log('Payments data changed, refreshing dashboard...');
      refetchMetrics();
      refetchSalePaymentStatus();
      refetchDashboardMetrics();
    }).subscribe();
    channels.push(paymentsChannel);
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [refetchMetrics, refetchSalePaymentStatus, refetchDashboardMetrics]);

  // Calculate overdue deliveries
  const overdueDeliveries = salePaymentStatus.filter(sale => {
    if (!sale.delivery_date) return false;
    const deliveryDate = new Date(sale.delivery_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deliveryDate < today && sale.delivery_status !== 'Delivered';
  }).length;

  // Calculate customers with outstanding balance
  const customersWithBalance = salePaymentStatus.filter(sale => sale.balance_due > 0).length;
  if (metricsLoading) {
    return <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading dashboard...</div>
      </div>;
  }
  return <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6">
      {/* Welcome Header */}
      <Card className="futuristic-card">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold glow-text text-zinc-950">
                Furniture ERP Dashboard
              </h1>
              <p className="text-base md:text-lg text-zinc-950">
                Welcome back! Here's what's happening with your business today.
              </p>
            </div>
            <div className="text-left lg:text-right space-y-2">
              <p className="text-accent font-semibold text-lg md:text-xl">
                {currentTime.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
              </p>
              <p className="text-muted-foreground text-sm">
                {stores.length} Active Stores
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="futuristic-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-full flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-950">Total Sales</p>
                <p className="text-xl md:text-2xl font-bold text-green-400 truncate">
                  {formatCurrency(metrics?.totalSales || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-full flex-shrink-0">
                <ShoppingCart className="w-6 h-6 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-950">Total Purchases</p>
                <p className="text-xl md:text-2xl font-bold text-blue-400 truncate">
                  {formatCurrency(metrics?.totalPurchases || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-full flex-shrink-0">
                <DollarSign className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground font-medium">Gross Profit</p>
                <p className={`text-xl md:text-2xl font-bold truncate ${(metrics?.grossProfit || 0) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  {formatCurrency(metrics?.grossProfit || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card hover:scale-105 transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-full flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground font-medium">Low Stock Items</p>
                <p className="text-xl md:text-2xl font-bold text-orange-400">
                  {metrics?.lowStockCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-full flex-shrink-0">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-blue-200">Outstanding from Customers</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-400 truncate">
                  {formatCurrency(metrics?.outstandingBalance || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{customersWithBalance} customers</Badge>
              <span className="text-sm text-blue-300">have pending payments</span>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-500/20 rounded-full flex-shrink-0">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-blue-200">Payable to Suppliers</p>
                <p className="text-xl sm:text-2xl font-bold text-red-400 truncate">
                  {formatCurrency(metrics?.supplierPayable || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="destructive">{overdueDeliveries} overdue</Badge>
              <span className="text-sm text-blue-300">deliveries pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SalesTrendChart data={dashboardMetrics?.salesTrend || []} />
        <TopSellingChart data={dashboardMetrics?.topSellingItems || []} />
      </div>

      {/* Alerts and Notifications */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Business Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(metrics?.lowStockCount || 0) > 0 && <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <Package className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-orange-400 font-semibold">Low Stock Alert</p>
                  <p className="text-blue-200 text-sm">
                    {metrics?.lowStockCount} items are running low on stock
                  </p>
                </div>
              </div>}
            
            {overdueDeliveries > 0 && <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <Truck className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-400 font-semibold">Overdue Deliveries</p>
                  <p className="text-blue-200 text-sm">
                    {overdueDeliveries} deliveries are past their due date
                  </p>
                </div>
              </div>}
            
            {customersWithBalance > 0 && <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <DollarSign className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-purple-400 font-semibold">Outstanding Payments</p>
                  <p className="text-blue-200 text-sm">
                    {customersWithBalance} customers have outstanding balances totaling {formatCurrency(metrics?.outstandingBalance || 0)}
                  </p>
                </div>
              </div>}
            
            {(metrics?.lowStockCount || 0) === 0 && overdueDeliveries === 0 && customersWithBalance === 0 && <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-green-400 font-semibold">All Systems Normal</p>
                  <p className="text-blue-200 text-sm">
                    Your business is running smoothly with no critical alerts
                  </p>
                </div>
              </div>}
          </div>
        </CardContent>
      </Card>
    </div>;
}