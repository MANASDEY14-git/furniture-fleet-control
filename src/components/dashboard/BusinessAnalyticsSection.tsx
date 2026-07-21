import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/utils/currencyUtils';

interface BusinessAnalyticsSectionProps {
  metrics: any;
  isLoading: boolean;
}

export default function BusinessAnalyticsSection({ metrics, isLoading }: BusinessAnalyticsSectionProps) {
  if (isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="simple-card animate-pulse">
          <CardContent className="p-6">
            <div className="h-80 bg-muted rounded" />
          </CardContent>
        </Card>
        <Card className="simple-card animate-pulse">
          <CardContent className="p-6">
            <div className="h-80 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mock order status data - in real implementation, this would come from the metrics
  const orderStatusData = [
    { name: 'Delivered', value: Math.round((metrics?.fulfillmentRate || 0) * (metrics?.totalOrders || 0) / 100), color: '#22c55e' },
    { name: 'Pending', value: (metrics?.totalOrders || 0) - Math.round((metrics?.fulfillmentRate || 0) * (metrics?.totalOrders || 0) / 100), color: '#f59e0b' },
    { name: 'Cancelled', value: Math.round((metrics?.totalOrders || 0) * 0.05), color: '#ef4444' }
  ];

  // Mock inventory status data
  const inventoryStatusData = [
    { name: 'In Stock', value: (metrics?.totalInventoryValue || 0), color: '#22c55e' },
    { name: 'Low Stock', value: (metrics?.lowStockCount || 0) * 10000, color: '#f59e0b' },
    { name: 'Out of Stock', value: (metrics?.outOfStockCount || 0) * 5000, color: '#ef4444' }
  ];

  // Mock financial breakdown
  const financialData = [
    { category: 'Sales Revenue', amount: metrics?.totalSales || 0, type: 'income' },
    { category: 'Purchase Costs', amount: metrics?.totalPurchases || 0, type: 'expense' },
    { category: 'Gross Profit', amount: metrics?.grossProfit || 0, type: 'profit' },
    { category: 'Outstanding', amount: metrics?.outstandingBalance || 0, type: 'pending' }
  ];

  const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Order Status Distribution */}
        <Card className="simple-card">
          <CardHeader>
            <CardTitle className="text-foreground">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${Number(value)}`}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Status */}
        <Card className="simple-card">
          <CardHeader>
            <CardTitle className="text-foreground">Inventory Value Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={inventoryStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${formatCurrency(Number(value))}`}
                >
                  {inventoryStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Financial Breakdown */}
      <Card className="simple-card">
        <CardHeader>
          <CardTitle className="text-foreground">Financial Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="category" 
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Bar 
                dataKey="amount" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Best-Selling Products */}
        <Card className="simple-card">
          <CardHeader>
            <CardTitle className="text-foreground">Best-Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {metrics?.bestSellingProducts?.length > 0 ? (
                metrics.bestSellingProducts.map((product: any, index: number) => (
                  <div key={index} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                    <span className="font-medium text-foreground">{product.name}</span>
                    <span className="text-muted-foreground">{product.quantity} sold</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No sales data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Slow-Moving Inventory */}
        <Card className="simple-card">
          <CardHeader>
            <CardTitle className="text-foreground">Slow-Moving Inventory</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {metrics?.slowMovingInventory?.length > 0 ? (
                metrics.slowMovingInventory.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center border-b border-border pb-2 last:border-0 last:pb-0">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <div className="text-right">
                      <p className="text-sm text-foreground">{item.quantity_available} in stock</p>
                      <p className="text-xs text-muted-foreground">{item.sales} sold</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No inventory data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}