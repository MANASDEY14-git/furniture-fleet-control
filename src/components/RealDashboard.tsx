import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign, AlertTriangle, Users, Truck } from 'lucide-react';
import { useRealDashboardMetrics } from '@/hooks/useRealDashboardMetrics';
import { useSalePaymentStatus } from '@/hooks/useSalePaymentStatus';
import { useStores } from '@/hooks/useStores';
import { formatCurrency } from '@/utils/currencyUtils';
import EnhancedMetricsGrid from '@/components/dashboard/EnhancedMetricsGrid';
import BusinessAnalyticsSection from '@/components/dashboard/BusinessAnalyticsSection';
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
    }).subscribe();
    channels.push(paymentsChannel);
    
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [refetchMetrics, refetchSalePaymentStatus]);

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-8">
      {/* Welcome Header */}
      <Card className="simple-card">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                Furniture ERP Dashboard
              </h1>
              <p className="text-base md:text-lg text-muted-foreground">
                Welcome back! Here's what's happening with your business today.
              </p>
            </div>
            <div className="text-left lg:text-right space-y-2">
              <p className="text-foreground font-medium text-lg md:text-xl">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="simple-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary rounded-lg flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-xl md:text-2xl font-bold text-foreground truncate">
                  {formatCurrency(metrics?.totalSales || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="simple-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary rounded-lg flex-shrink-0">
                <ShoppingCart className="w-6 h-6 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total Purchases</p>
                <p className="text-xl md:text-2xl font-bold text-foreground truncate">
                  {formatCurrency(metrics?.totalPurchases || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="simple-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary rounded-lg flex-shrink-0">
                <DollarSign className="w-6 h-6 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground font-medium">Gross Profit</p>
                <p className={`text-xl md:text-2xl font-bold truncate ${(metrics?.grossProfit || 0) >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {formatCurrency(metrics?.grossProfit || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="simple-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary rounded-lg flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground font-medium">Low Stock Items</p>
                <p className="text-xl md:text-2xl font-bold text-foreground">
                  {metrics?.lowStockCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="simple-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-secondary rounded-lg flex-shrink-0">
                <Users className="w-6 h-6 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Outstanding from Customers</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {formatCurrency(metrics?.outstandingBalance || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{customersWithBalance} customers</Badge>
              <span className="text-sm text-muted-foreground">have pending payments</span>
            </div>
          </CardContent>
        </Card>

        <Card className="simple-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-secondary rounded-lg flex-shrink-0">
                <TrendingDown className="w-6 h-6 text-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Payable to Suppliers</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {formatCurrency(metrics?.supplierPayable || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="destructive">{overdueDeliveries} overdue</Badge>
              <span className="text-sm text-muted-foreground">deliveries pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Metrics Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Business Analytics</h2>
        <EnhancedMetricsGrid metrics={metrics} isLoading={metricsLoading} />
      </div>

      {/* Advanced Analytics Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Advanced Analytics</h2>
        <BusinessAnalyticsSection metrics={metrics} isLoading={metricsLoading} />
      </div>

      {/* Alerts and Notifications */}
      <Card className="simple-card">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Business Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(metrics?.lowStockCount || 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
                <Package className="w-5 h-5 text-foreground" />
                <div>
                  <p className="text-foreground font-semibold">Low Stock Alert</p>
                  <p className="text-muted-foreground text-sm">
                    {metrics?.lowStockCount} items are running low on stock
                  </p>
                </div>
              </div>
            )}
            
            {overdueDeliveries > 0 && (
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
                <Truck className="w-5 h-5 text-foreground" />
                <div>
                  <p className="text-foreground font-semibold">Overdue Deliveries</p>
                  <p className="text-muted-foreground text-sm">
                    {overdueDeliveries} deliveries are past their due date
                  </p>
                </div>
              </div>
            )}
            
            {customersWithBalance > 0 && (
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
                <DollarSign className="w-5 h-5 text-foreground" />
                <div>
                  <p className="text-foreground font-semibold">Outstanding Payments</p>
                  <p className="text-muted-foreground text-sm">
                    {customersWithBalance} customers have outstanding balances totaling {formatCurrency(metrics?.outstandingBalance || 0)}
                  </p>
                </div>
              </div>
            )}
            
            {(metrics?.lowStockCount || 0) === 0 && overdueDeliveries === 0 && customersWithBalance === 0 && (
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
                <TrendingUp className="w-5 h-5 text-foreground" />
                <div>
                  <p className="text-foreground font-semibold">All Systems Normal</p>
                  <p className="text-muted-foreground text-sm">
                    Your business is running smoothly with no critical alerts
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}