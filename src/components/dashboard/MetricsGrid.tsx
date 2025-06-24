
import React from 'react';
import { DollarSign, Package, ShoppingCart, Truck, Percent } from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import type { EnhancedDashboardMetrics, TopSellingItem, LowStockItem } from '@/types';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

interface MetricsGridProps {
  metrics: EnhancedDashboardMetrics & {
    topSellingItems: TopSellingItem[];
    lowStockItems: LowStockItem[];
    salesTrend: Array<{ date: string; sales: number; profit: number }>;
  };
  dateFilter: DateFilter;
  isLoading: boolean;
}

export default function MetricsGrid({ metrics, dateFilter, isLoading }: MetricsGridProps) {
  const getDateFilterDescription = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'week': return 'This week';
      case 'month': return 'This month';
      default: return 'Selected period';
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <MetricCard
        title="Total Sales"
        value={isLoading ? "Loading..." : `$${(metrics?.totalSalesToday || 0).toLocaleString()}`}
        icon={<DollarSign className="w-5 h-5" />}
        description={getDateFilterDescription()}
      />
      <MetricCard
        title="Inventory Value"
        value={isLoading ? "Loading..." : `$${(metrics?.totalStockValue || 0).toLocaleString()}`}
        icon={<Package className="w-5 h-5" />}
        description="Current stock value"
      />
      <MetricCard
        title="Payments Received"
        value={isLoading ? "Loading..." : `$${(metrics?.paymentsReceived || 0).toLocaleString()}`}
        icon={<ShoppingCart className="w-5 h-5" />}
        description="Period payments"
      />
      <MetricCard
        title="Pending Deliveries"
        value={isLoading ? "Loading..." : (metrics?.pendingDeliveries || 0).toString()}
        icon={<Truck className="w-5 h-5" />}
        description="Awaiting delivery"
      />
      <MetricCard
        title="Profit Margin"
        value={isLoading ? "Loading..." : `${(metrics?.profitMarginPercentage || 0).toFixed(1)}%`}
        icon={<Percent className="w-5 h-5" />}
        description="Period profit margin"
      />
    </div>
  );
}
