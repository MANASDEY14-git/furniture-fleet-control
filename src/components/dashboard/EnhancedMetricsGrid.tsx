import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  ShoppingCart,
  BarChart3,
  Percent,
  Boxes,
  PackageX
} from 'lucide-react';
import { formatCurrency, formatCurrencyShort } from '@/utils/currencyUtils';

interface EnhancedMetricsGridProps {
  metrics: any;
  isLoading: boolean;
}

export default function EnhancedMetricsGrid({ metrics, isLoading }: EnhancedMetricsGridProps) {
  if (isLoading) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="simple-card animate-pulse">
          <CardContent className="p-6">
            <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Average Order Value',
      value: formatCurrency(metrics?.avgOrderValue || 0),
      icon: <BarChart3 />,
      description: `${metrics?.totalOrders || 0} total orders`,
      trend: null
    },
    {
      title: 'Fulfillment Rate',
      value: `${(metrics?.fulfillmentRate || 0).toFixed(1)}%`,
      icon: <Package />,
      description: 'Orders delivered on time',
      trend: {
        value: metrics?.fulfillmentRate >= 80 ? 5 : -3,
        label: metrics?.fulfillmentRate >= 80 ? 'Good' : 'Needs improvement'
      }
    },
    {
      title: 'Out of Stock Items',
      value: metrics?.outOfStockCount || 0,
      icon: <PackageX />,
      description: 'Items with zero inventory',
      trend: null
    },
    {
      title: 'Cash Flow Ratio',
      value: (metrics?.cashFlowRatio || 0).toFixed(2),
      icon: <DollarSign />,
      description: 'Receipts vs Payments',
      trend: {
        value: metrics?.cashFlowRatio >= 1 ? 10 : -5,
        label: metrics?.cashFlowRatio >= 1 ? 'Positive' : 'Negative'
      }
    },
    {
      title: 'Material Stock Value',
      value: formatCurrencyShort(metrics?.totalMaterialValue || 0),
      icon: <Boxes />,
      description: 'Raw materials inventory',
      trend: null
    },
    {
      title: 'Profit Margin',
      value: `${(metrics?.profitMargin || 0).toFixed(1)}%`,
      icon: <Percent />,
      description: 'Gross profit percentage',
      trend: {
        value: metrics?.profitMargin >= 20 ? 8 : metrics?.profitMargin >= 10 ? 0 : -8,
        label: metrics?.profitMargin >= 20 ? 'Excellent' : metrics?.profitMargin >= 10 ? 'Good' : 'Low'
      }
    },
    {
      title: 'Inventory Value',
      value: formatCurrencyShort(metrics?.totalInventoryValue || 0),
      icon: <Package />,
      description: 'Total finished goods value',
      trend: null
    },
    {
      title: 'Payment Collection',
      value: formatCurrencyShort(metrics?.totalReceipts || 0),
      icon: <TrendingUp />,
      description: 'Total receipts received',
      trend: null
    },
    {
      title: 'Customer Lifetime Value',
      value: formatCurrency(metrics?.customerLifetimeValue || 0),
      icon: <DollarSign />,
      description: 'Average revenue per customer',
      trend: null
    },
    {
      title: 'Repeat Customers',
      value: metrics?.repeatCustomers || 0,
      icon: <TrendingUp />,
      description: 'Customers with > 1 order',
      trend: null
    },
    {
      title: 'Delivery Delays',
      value: metrics?.deliveryDelays || 0,
      icon: <AlertTriangle />,
      description: 'Overdue deliveries',
      trend: {
        value: (metrics?.deliveryDelays || 0) === 0 ? 1 : -1,
        label: (metrics?.deliveryDelays || 0) === 0 ? 'Good' : 'Needs attention'
      }
    },
    {
      title: 'Pending Orders',
      value: metrics?.pendingOrders || 0,
      icon: <Package />,
      description: 'Orders awaiting delivery',
      trend: null
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {metricCards.map((metric, index) => (
        <Card key={index} className="simple-card hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-secondary rounded-lg flex-shrink-0">
                {React.cloneElement(metric.icon, { className: "w-5 h-5 text-foreground" })}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-muted-foreground leading-tight">{metric.title}</p>
                <p className="text-xl font-bold text-foreground truncate leading-tight">
                  {metric.value}
                </p>
                {metric.description && (
                  <p className="text-xs text-muted-foreground leading-tight">
                    {metric.description}
                  </p>
                )}
                {metric.trend && (
                  <div className="flex items-center gap-2 pt-1">
                    {metric.trend.value >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500" />
                    )}
                    <Badge 
                      variant={metric.trend.value >= 0 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {metric.trend.label}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}