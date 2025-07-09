import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Package, DollarSign, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';

export default function MetricsGrid({ metrics = {}, dateFilter = 'month', isLoading = false }) {
  const cards = [
    {
      title: `Sales (${dateFilter})`,
      icon: <TrendingUp className="w-5 h-5 text-green-400" />,
      value: formatCurrency(metrics?.totalSalesToday || 0),
      color: 'green',
    },
    {
      title: 'Stock Value',
      icon: <Package className="w-5 h-5 text-yellow-400" />,
      value: formatCurrency(metrics?.totalStockValue || 0),
      color: 'yellow',
    },
    {
      title: 'Payments Received',
      icon: <DollarSign className="w-5 h-5 text-blue-400" />,
      value: formatCurrency(metrics?.paymentsReceived || 0),
      color: 'blue',
    },
    {
      title: 'Outstanding Balance',
      icon: <DollarSign className="w-5 h-5 text-purple-400" />,
      value: formatCurrency(metrics?.outstandingBalance || 0),
      color: 'purple',
    },
    {
      title: 'Supplier Payables',
      icon: <DollarSign className="w-5 h-5 text-red-400" />,
      value: formatCurrency(metrics?.supplierPayable || 0),
      color: 'red',
    },
    {
      title: 'Gross Profit',
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      value: formatCurrency(metrics?.grossProfit || 0),
      color: 'emerald',
    },
    {
      title: 'Low Stock Count',
      icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
      value: metrics?.lowStockCount || 0,
      color: 'orange',
    },
    {
      title: 'Profit Margin',
      icon: <TrendingUp className="w-5 h-5 text-cyan-400" />,
      value: `${(metrics?.profitMarginPercentage || 0).toFixed(2)}%`,
      color: 'cyan',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <Card key={idx} className="futuristic-card">
          <CardContent className="flex items-center gap-4 p-4">
            <div className={`p-3 bg-${card.color}-500/20 rounded-full flex-shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm text-blue-300">{card.title}</p>
              <p className={`text-xl font-bold text-${card.color}-400`}>
                {card.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
