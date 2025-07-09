import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, DollarSign, Users, Truck } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';

interface MetricsGridProps {
  metrics: {
    totalSalesToday: number;
    totalStockValue: number;
    paymentsReceived: number;
    pendingDeliveries: number;
    profitMarginPercentage: number;
    outstandingBalance: number;
    supplierPayable: number;
    lowStockCount: number;
    grossProfit: number;
  };
  dateFilter: 'today' | 'week' | 'month';
  isLoading: boolean;
}

export default function MetricsGrid({ metrics, dateFilter, isLoading }: MetricsGridProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 text-blue-300">
        Loading metrics...
      </div>
    );
  }

  const cards = [
    {
      title: `Sales (${dateFilter})`,
      icon: <TrendingUp className="w-5 h-5 text-green-400" />,
      value: formatCurrency(metrics.totalSalesToday),
      color: 'green'
    },
    {
      title: 'Stock Value',
      icon: <Package className="w-5 h-5 text-cyan-400" />,
      value: formatCurrency(metrics.totalStockValue),
      color: 'cyan'
    },
    {
      title: 'Received Payments',
      icon: <DollarSign className="w-5 h-5 text-purple-400" />,
      value: formatCurrency(metrics.paymentsReceived),
      color: 'purple'
    },
    {
      title: 'Pending Deliveries',
      icon: <Truck className="w-5 h-5 text-orange-400" />,
      value: metrics.pendingDeliveries,
      color: 'orange'
    },
    {
      title: 'Profit Margin',
      icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
      value: `${metrics.profitMarginPercentage.toFixed(1)}%`,
      color: 'blue'
    },
    {
      title: 'Outstanding Balance',
      icon: <Users className="w-5 h-5 text-pink-400" />,
      value: formatCurrency(metrics.outstandingBalance),
      color: 'pink'
    },
    {
      title: 'Supplier Payable',
      icon: <DollarSign className="w-5 h-5 text-red-400" />,
      value: formatCurrency(metrics.supplierPayable),
      color: 'red'
    },
    {
      title: 'Low Stock Items',
      icon: <Package className="w-5 h-5 text-yellow-400" />,
      value: metrics.lowStockCount,
      color: 'yellow'
    },
    {
      title: 'Gross Profit',
      icon: <TrendingUp className="w-5 h-5 text-lime-400" />,
      value: formatCurrency(metrics.grossProfit),
      color: 'lime'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <Card key={index} className="futuristic-card border border-blue-500/20 bg-gradient-to-tr from-black/20 to-blue-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-300">
              {card.icon}
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
