import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, ShoppingCart, Package, DollarSign, AlertTriangle, Users, Truck, Brain, BarChart3 } from 'lucide-react';
import { useRealDashboardMetrics } from '@/hooks/useRealDashboardMetrics';
import { useSalePaymentStatus } from '@/hooks/useSalePaymentStatus';
import { useStores } from '@/hooks/useStores';
import { formatCurrency } from '@/utils/currencyUtils';
import EnhancedMetricsGrid from '@/components/dashboard/EnhancedMetricsGrid';
import BusinessAnalyticsSection from '@/components/dashboard/BusinessAnalyticsSection';
import AIInsightsLayout from '@/components/ai/AIInsightsLayout';
import DeliveryAlertsCard from '@/components/dashboard/DeliveryAlertsCard';

export default function RealDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const {
    data: metrics,
    isLoading: metricsLoading
  } = useRealDashboardMetrics();
  const {
    data: salePaymentStatus = []
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
                AI-Powered ERP Dashboard
              </h1>
              <p className="text-base md:text-lg text-muted-foreground">
                Welcome back! Here's what's happening with your AI-enhanced business today.
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
                {stores.length} Active Stores • AI Enhanced
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 simple-card">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Business Overview
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          
          {/* Delivery Alerts - Prominent position at top */}
          <DeliveryAlertsCard />

      {/* Core Metrics - 3x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="simple-card">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-secondary rounded-lg flex-shrink-0">
                <DollarSign className="w-8 h-8 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-muted-foreground mb-2">Today's Sales</p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(metrics?.todaysSales || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="simple-card">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-secondary rounded-lg flex-shrink-0">
                <TrendingUp className="w-8 h-8 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-muted-foreground mb-2">Weekly Sales</p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(metrics?.weeklySales || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="simple-card">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-secondary rounded-lg flex-shrink-0">
                <BarChart3 className="w-8 h-8 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-muted-foreground mb-2">Total Sales (All Time)</p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(metrics?.totalSales || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="simple-card">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-secondary rounded-lg flex-shrink-0">
                <ShoppingCart className="w-8 h-8 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-muted-foreground mb-2">Total Purchases</p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(metrics?.totalPurchases || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="simple-card">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-secondary rounded-lg flex-shrink-0">
                <DollarSign className="w-8 h-8 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-muted-foreground mb-2">Gross Profit</p>
                <p className={`text-3xl font-bold ${(metrics?.grossProfit || 0) >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {formatCurrency(metrics?.grossProfit || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="simple-card">
          <CardContent className="p-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-secondary rounded-lg flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-muted-foreground mb-2">Low Stock Items</p>
                <p className="text-3xl font-bold text-foreground">
                  {metrics?.lowStockCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Payments - Full Width */}
      <Card className="simple-card">
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-secondary rounded-lg flex-shrink-0">
              <Users className="w-8 h-8 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-muted-foreground mb-2">Outstanding from Customers</p>
              <p className="text-3xl font-bold text-foreground mb-4">
                {formatCurrency(metrics?.outstandingBalance || 0)}
              </p>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{customersWithBalance} customers</span> have pending payments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Business Metrics */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Business Analytics</h2>
        <EnhancedMetricsGrid metrics={metrics} isLoading={metricsLoading} />
      </div>

          {/* Analytics Charts */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Advanced Analytics</h2>
            <BusinessAnalyticsSection metrics={metrics} isLoading={metricsLoading} />
          </div>
        </TabsContent>

        <TabsContent value="ai-insights">
          <AIInsightsLayout />
        </TabsContent>
      </Tabs>
    </div>
  );
}