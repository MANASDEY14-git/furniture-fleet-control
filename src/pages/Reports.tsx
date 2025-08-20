
import React, { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MetricCard from '@/components/MetricCard';
import SalesTrendChart from '@/components/SalesTrendChart';
import TopSellingChart from '@/components/TopSellingChart';
import DateFilterSelector from '@/components/DateFilterSelector';
import ExportButton from '@/components/ExportButton';
import AuditTrailViewer from '@/components/AuditTrailViewer';
import { useEnhancedDashboardMetrics } from '@/hooks/useEnhancedDashboardMetrics';
import { useSales } from '@/hooks/useSales';
import { usePurchases } from '@/hooks/usePurchases';
import { usePayments } from '@/hooks/usePayments';
import { useItems } from '@/hooks/useItems';
import { formatCurrency } from '@/utils/currencyUtils';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

export default function Reports() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  
  const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useEnhancedDashboardMetrics(dateFilter, customDateRange);
  const { data: sales = [] } = useSales();
  const { data: purchases = [] } = usePurchases();
  const { data: payments = [] } = usePayments();
  const { data: items = [] } = useItems();

  // Filter data based on date range
  const getFilteredData = (data: any[], dateField = 'date') => {
    if (!customDateRange && dateFilter !== 'custom') return data;
    
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        if (!customDateRange) return data;
        startDate = customDateRange.from;
        endDate = customDateRange.to;
        break;
      default:
        return data;
    }

    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const filteredSales = getFilteredData(sales);
  const filteredPurchases = getFilteredData(purchases);
  const filteredPayments = getFilteredData(payments);

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-bold glow-text">Analytics Dashboard</h1>
              <p className="text-blue-300">Loading comprehensive reports...</p>
            </div>
          </div>
          <DateFilterSelector
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
          />
        </div>

        {/* Loading skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {['Total Sales', 'Total Purchases', 'Net Profit', 'Stock Value'].map((title) => (
            <Card key={title} className="futuristic-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <p className="text-sm text-blue-200">{title}</p>
                    <div className="h-8 w-24 bg-card-secondary rounded animate-pulse" />
                  </div>
                  <div className="h-10 w-10 bg-card-secondary rounded-full animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300 glow-text">Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-card-secondary rounded animate-pulse" />
            </CardContent>
          </Card>
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300 glow-text">Top Selling Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-card-secondary rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold glow-text">Analytics Dashboard</h1>
            <p className="text-blue-300">Comprehensive business insights</p>
          </div>
        </div>
        
        <DateFilterSelector
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          customDateRange={customDateRange}
          onCustomDateRangeChange={setCustomDateRange}
        />
      </div>

      {/* Enhanced Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sales"
          value={formatCurrency(metrics?.totalSales || 0)}
          icon={<DollarSign />}
          description="Revenue generated from sales orders"
        />
        <MetricCard
          title="Total Purchases"
          value={formatCurrency(metrics?.totalPurchases || 0)}
          icon={<Package />}
          description="Cost of materials and goods purchased"
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(metrics?.totalProfit || 0)}
          icon={<TrendingUp />}
          description="Sales revenue minus costs"
          trend={{
            value: metrics?.profitMarginPercentage || 0,
            label: "profit margin"
          }}
        />
        <MetricCard
          title="Stock Value"
          value={formatCurrency(metrics?.totalStockValue || 0)}
          icon={<Package />}
          description="Total value of current inventory"
        />
      </div>

      {/* Error state for metrics */}
      {metricsError && (
        <Card className="futuristic-card border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-400">
                <TrendingUp className="h-5 w-5" />
                <span>Some metrics data could not be loaded</span>
              </div>
              <button 
                onClick={() => refetchMetrics()}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Retry
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesTrendChart data={metrics?.salesTrend || []} />
        <TopSellingChart data={metrics?.topSellingItems || []} />
      </div>

      {/* Export Section */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-300 glow-text">
            <Download className="h-5 w-5" />
            Data Export Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h4 className="text-blue-200 font-medium">Sales Data</h4>
              <ExportButton 
                data={filteredSales} 
                filename={`sales-${dateFilter}`} 
                type="sales"
              />
            </div>
            <div className="space-y-2">
              <h4 className="text-blue-200 font-medium">Purchase Data</h4>
              <ExportButton 
                data={filteredPurchases} 
                filename={`purchases-${dateFilter}`} 
                type="purchases"
              />
            </div>
            <div className="space-y-2">
              <h4 className="text-blue-200 font-medium">Payment Data</h4>
              <ExportButton 
                data={filteredPayments} 
                filename={`payments-${dateFilter}`} 
                type="payments"
              />
            </div>
            <div className="space-y-2">
              <h4 className="text-blue-200 font-medium">Inventory Data</h4>
              <ExportButton 
                data={items} 
                filename="inventory-current" 
                type="items"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <AuditTrailViewer />
    </div>
  );
}
