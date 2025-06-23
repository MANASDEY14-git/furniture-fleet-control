
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SalesTrendData {
  date: string;
  sales: number;
  profit: number;
}

interface SalesTrendChartProps {
  data: SalesTrendData[];
}

export default function SalesTrendChart({ data }: SalesTrendChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales & Profit Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
            />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip 
              labelFormatter={(value) => formatDate(value as string)}
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'sales' ? 'Sales' : 'Profit'
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="sales" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="Sales"
            />
            <Line 
              type="monotone" 
              dataKey="profit" 
              stroke="#82ca9d" 
              strokeWidth={2}
              name="Profit"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
