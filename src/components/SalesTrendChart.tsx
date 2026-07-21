
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currencyUtils';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

interface SalesTrendData {
  date: string;
  sales: number;
  profit: number;
}

interface SalesTrendChartProps {
  data?: SalesTrendData[];
  dateFilter?: DateFilter;
  customDateRange?: { from: Date; to: Date } | null;
}

export default function SalesTrendChart({ data = [] }: SalesTrendChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="text-cyan-300 glow-text">Sales & Profit Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fill: '#60a5fa' }}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fill: '#60a5fa' }}
            />
            <Tooltip 
              labelFormatter={(value) => formatDate(value as string)}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'sales' ? 'Sales' : 'Profit'
              ]}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                color: '#e2e8f0'
              }}
            />
            <Legend 
              wrapperStyle={{ color: '#60a5fa' }}
            />
            <Line 
              type="monotone" 
              dataKey="sales" 
              stroke="#0ea5e9" 
              strokeWidth={3}
              name="Sales"
              dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="profit" 
              stroke="#06b6d4" 
              strokeWidth={3}
              name="Profit"
              dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
