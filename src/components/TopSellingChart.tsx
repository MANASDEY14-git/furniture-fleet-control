
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currencyUtils';
import type { TopSellingItem } from '@/types';

interface TopSellingChartProps {
  data?: TopSellingItem[];
}

export default function TopSellingChart({ data = [] }: TopSellingChartProps) {
  return (
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="text-cyan-300 glow-text">Top Selling Items</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#1e40af" />
            <XAxis 
              type="number" 
              tickFormatter={formatCurrency}
              tick={{ fill: '#60a5fa' }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={120}
              tick={{ fontSize: 12, fill: '#60a5fa' }}
            />
            <Tooltip 
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #0ea5e9',
                borderRadius: '8px',
                color: '#e2e8f0'
              }}
            />
            <Bar 
              dataKey="revenue" 
              fill="url(#colorGradient)"
              radius={[0, 4, 4, 0]}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
