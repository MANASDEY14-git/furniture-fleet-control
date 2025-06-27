
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  AlertTriangle,
  Users,
  Truck
} from 'lucide-react';
import { useRealDashboardMetrics } from '@/hooks/useRealDashboardMetrics';
import { useSalePaymentStatus } from '@/hooks/useSalePaymentStatus';
import { useStores } from '@/hooks/useStores';
import { formatCurrency } from '@/utils/currencyUtils';
import SalesTrendChart from '@/components/SalesTrendChart';
import TopSellingChart from '@/components/TopSellingChart';
import { useEnhancedDashboardMetrics } from '@/hooks/useEnhancedDashboardMetrics';

export default function RealDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { data: metrics, isLoading: metricsLoading } = useRealDashboardMetrics();
  const { data: salePaymentStatus = [] } = useSalePaymentStatus();
  const { data: stores = [] } = useStores();
  const { data: dashboardMetrics } = useEnhancedDashboardMetrics('month');

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
        <div className="text-lg glow-text">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card className="futuristic-card bg-gradient-to-r from-blue-600/10 to-cyan-600/10">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold glow-text">Furniture ERP Dashboard</h1>
              <p className="text-blue-300 mt-2">
                Welcome back! Here's what's happening with your business today.
              </p>
            </div>
            <div className="text-right">
              <p className="text-cyan-300 font-semibold">
                {currentTime.toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p className="text-blue-400 text-sm mt-1">
                {stores.length} Active Stores
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Total Sales</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(metrics?.totalSales || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <ShoppingCart className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Total Purchases</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(metrics?.totalPurchases || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-full">
                <DollarSign className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Gross Profit</p>
                <p className={`text-2xl font-bold ${(metrics?.grossProfit || 0) >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  {formatCurrency(metrics?.grossProfit || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-full">
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Low Stock Items</p>
                <p className="text-2xl font-bold text-orange-400">
                  {metrics?.lowStockCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/20 rounded-full">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Outstanding from Customers</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatCurrency(metrics?.outstandingBalance || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{customersWithBalance} customers</Badge>
              <span className="text-sm text-blue-300">have pending payments</span>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-500/20 rounded-full">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Payable to Suppliers</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(metrics?.supplierPayable || 0)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
            {(metrics?.lowStockCount || 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <Package className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-orange-400 font-semibold">Low Stock Alert</p>
                  <p className="text-blue-200 text-sm">
                    {metrics?.lowStockCount} items are running low on stock
                  </p>
                </div>
              </div>
            )}
            
            {overdueDeliveries > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <Truck className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-400 font-semibold">Overdue Deliveries</p>
                  <p className="text-blue-200 text-sm">
                    {overdueDeliveries} deliveries are past their due date
                  </p>
                </div>
              </div>
            )}
            
            {customersWithBalance > 0 && (
              <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <DollarSign className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-purple-400 font-semibold">Outstanding Payments</p>
                  <p className="text-blue-200 text-sm">
                    {customersWithBalance} customers have outstanding balances totaling {formatCurrency(metrics?.outstandingBalance || 0)}
                  </p>
                </div>
              </div>
            )}
            
            {(metrics?.lowStockCount || 0) === 0 && overdueDeliveries === 0 && customersWithBalance === 0 && (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-green-400 font-semibold">All Systems Normal</p>
                  <p className="text-blue-200 text-sm">
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
