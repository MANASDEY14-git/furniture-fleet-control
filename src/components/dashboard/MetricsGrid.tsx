import React from 'react';
import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  Truck, 
  Percent,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Target,
  Calendar,
  Package2,
  Timer
} from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import { formatCurrency, formatCurrencyShort } from '@/utils/currencyUtils';
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

  // Calculate trend percentages (mock data - replace with actual calculations)
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Mock previous period data (replace with actual data from your API)
  const previousMetrics = {
    totalSales: (metrics?.totalSalesToday || 0) * 0.85,
    stockValue: (metrics?.totalStockValue || 0) * 1.02,
    paymentsReceived: (metrics?.paymentsReceived || 0) * 0.92,
    pendingDeliveries: (metrics?.pendingDeliveries || 0) + 5,
    profitMargin: (metrics?.profitMarginPercentage || 0) - 2.3
  };

  const salesTrend = calculateTrend(metrics?.totalSalesToday || 0, previousMetrics.totalSales);
  const stockTrend = calculateTrend(metrics?.totalStockValue || 0, previousMetrics.stockValue);
  const paymentsTrend = calculateTrend(metrics?.paymentsReceived || 0, previousMetrics.paymentsReceived);
  const deliveriesTrend = calculateTrend(metrics?.pendingDeliveries || 0, previousMetrics.pendingDeliveries);
  const profitTrend = calculateTrend(metrics?.profitMarginPercentage || 0, previousMetrics.profitMargin);

  // Enhanced metric cards with additional data
  const enhancedMetrics = [
    {
      title: "Total Sales",
      value: isLoading ? "Loading..." : formatCurrencyShort(metrics?.totalSalesToday || 0),
      icon: <DollarSign className="w-5 h-5" />,
      description: getDateFilterDescription(),
      trend: salesTrend,
      additionalInfo: `Target: ${formatCurrencyShort(350000)}`,
      progress: ((metrics?.totalSalesToday || 0) / 350000) * 100,
      color: "bg-gradient-to-r from-emerald-500 to-emerald-600",
      lightColor: "bg-emerald-50",
      textColor: "text-emerald-700"
    },
    {
      title: "Inventory Value",
      value: isLoading ? "Loading..." : formatCurrencyShort(metrics?.totalStockValue || 0),
      icon: <Package className="w-5 h-5" />,
      description: "Current stock value",
      trend: stockTrend,
      additionalInfo: `${metrics?.lowStockItems?.length || 0} items low stock`,
      progress: 85,
      color: "bg-gradient-to-r from-blue-500 to-blue-600",
      lightColor: "bg-blue-50",
      textColor: "text-blue-700"
    },
    {
      title: "Payments Received",
      value: isLoading ? "Loading..." : formatCurrencyShort(metrics?.paymentsReceived || 0),
      icon: <ShoppingCart className="w-5 h-5" />,
      description: "Period payments",
      trend: paymentsTrend,
      additionalInfo: "Outstanding: ₹33,500",
      progress: 75,
      color: "bg-gradient-to-r from-purple-500 to-purple-600",
      lightColor: "bg-purple-50",
      textColor: "text-purple-700"
    },
    {
      title: "Pending Deliveries",
      value: isLoading ? "Loading..." : (metrics?.pendingDeliveries || 0).toString(),
      icon: <Truck className="w-5 h-5" />,
      description: "Awaiting delivery",
      trend: deliveriesTrend,
      additionalInfo: "Avg. delivery: 2.5 days",
      progress: 0,
      color: "bg-gradient-to-r from-orange-500 to-orange-600",
      lightColor: "bg-orange-50",
      textColor: "text-orange-700"
    },
    {
      title: "Profit Margin",
      value: isLoading ? "Loading..." : `${(metrics?.profitMarginPercentage || 0).toFixed(1)}%`,
      icon: <Percent className="w-5 h-5" />,
      description: "Period profit margin",
      trend: profitTrend,
      additionalInfo: "Industry avg: 15.2%",
      progress: (metrics?.profitMarginPercentage || 0) / 25 * 100,
      color: "bg-gradient-to-r from-indigo-500 to-indigo-600",
      lightColor: "bg-indigo-50",
      textColor: "text-indigo-700"
    }
  ];

  // Additional metrics for second row
  const additionalMetrics = [
    {
      title: "Active Customers",
      value: isLoading ? "Loading..." : "1,247",
      icon: <Users className="w-5 h-5" />,
      description: "This month",
      trend: 8.5,
      additionalInfo: "New: 23 customers",
      color: "bg-gradient-to-r from-teal-500 to-teal-600",
      lightColor: "bg-teal-50",
      textColor: "text-teal-700"
    },
    {
      title: "Orders Processed",
      value: isLoading ? "Loading..." : "456",
      icon: <Package2 className="w-5 h-5" />,
      description: getDateFilterDescription(),
      trend: 12.3,
      additionalInfo: "Avg. order: ₹2,845",
      color: "bg-gradient-to-r from-cyan-500 to-cyan-600",
      lightColor: "bg-cyan-50",
      textColor: "text-cyan-700"
    },
    {
      title: "Avg. Delivery Time",
      value: isLoading ? "Loading..." : "2.3 days",
      icon: <Timer className="w-5 h-5" />,
      description: "Current average",
      trend: -15.2,
      additionalInfo: "Target: 2.0 days",
      color: "bg-gradient-to-r from-rose-500 to-rose-600",
      lightColor: "bg-rose-50",
      textColor: "text-rose-700"
    },
    {
      title: "Monthly Target",
      value: isLoading ? "Loading..." : "78%",
      icon: <Target className="w-5 h-5" />,
      description: "Progress this month",
      trend: 5.4,
      additionalInfo: "₹2.1M of ₹2.7M",
      color: "bg-gradient-to-r from-amber-500 to-amber-600",
      lightColor: "bg-amber-50",
      textColor: "text-amber-700"
    },
    {
      title: "Top Category",
      value: isLoading ? "Loading..." : "Sofas",
      icon: <Calendar className="w-5 h-5" />,
      description: "Best performing",
      trend: 22.1,
      additionalInfo: "₹1.2M revenue",
      color: "bg-gradient-to-r from-violet-500 to-violet-600",
      lightColor: "bg-violet-50",
      textColor: "text-violet-700"
    }
  ];

  const EnhancedMetricCard = ({ metric }: { metric: any }) => {
    const isNegativeTrend = metric.trend < 0;
    const TrendIcon = isNegativeTrend ? TrendingDown : TrendingUp;
    const trendColor = isNegativeTrend ? "text-red-500" : "text-green-500";
    
    return (
      <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 hover:border-gray-200 overflow-hidden">
        {/* Gradient header */}
        <div className={`h-1 ${metric.color}`}></div>
        
        <div className="p-6">
          {/* Header with icon and trend */}
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg ${metric.lightColor}`}>
              <div className={metric.textColor}>
                {metric.icon}
              </div>
            </div>
            {metric.trend !== 0 && (
              <div className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {Math.abs(metric.trend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Main content */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
            </div>
            <p className="text-xs text-gray-500">{metric.description}</p>
          </div>

          {/* Progress bar (if applicable) */}
          {metric.progress > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-xs font-medium text-gray-600">
                  {metric.progress.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${metric.color}`}
                  style={{ width: `${Math.min(metric.progress, 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Additional info */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">{metric.additionalInfo}</p>
          </div>
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"></div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Primary metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-900">Key Performance Indicators</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {enhancedMetrics.map((metric, index) => (
            <EnhancedMetricCard key={index} metric={metric} />
          ))}
        </div>
      </div>

      {/* Secondary metrics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-900">Additional Insights</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {additionalMetrics.map((metric, index) => (
            <EnhancedMetricCard key={index} metric={metric} />
          ))}
        </div>
      </div>

      {/* Quick alerts section */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-medium text-red-800">Business Alerts</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg p-3 border border-red-100">
            <p className="text-sm text-red-700">
              <span className="font-medium">{metrics?.lowStockItems?.length || 12}</span> items running low on stock
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-orange-100">
            <p className="text-sm text-orange-700">
              <span className="font-medium">5</span> customers have outstanding payments
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-yellow-100">
            <p className="text-sm text-yellow-700">
              <span className="font-medium">3</span> deliveries are delayed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
