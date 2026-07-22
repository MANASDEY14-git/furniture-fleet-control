import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';

interface MonthlyTrendChartProps {
  data?: Array<{
    month: string;
    revenue: number;
    profit: number;
    orders: number;
    aov: number;
    conversion: number;
  }>;
}

export function MonthlyTrendChart({ data = [] }: MonthlyTrendChartProps) {
  const [metric, setMetric] = useState<'revenue' | 'profit' | 'orders' | 'aov' | 'conversion'>('revenue');
  const [timeframe, setTimeframe] = useState<'Month' | 'Quarter' | 'Year'>('Month');

  if (!data || data.length === 0) return null;

  const chartData = data.map(item => ({
    month: item.month,
    Revenue: Number((item.revenue / 100000).toFixed(2)),
    Profit: Number((item.profit / 100000).toFixed(2)),
    Orders: item.orders,
    AOV: Math.round(item.aov / 1000), // in Thousands
    Conversion: item.conversion,
  }));

  const getMetricKey = () => {
    switch (metric) {
      case 'profit': return { key: 'Profit', label: 'Gross Profit (₹ Lakh)', stroke: '#10b981', fill: '#10b981' };
      case 'orders': return { key: 'Orders', label: 'Orders Closed', stroke: '#8b5cf6', fill: '#8b5cf6' };
      case 'aov': return { key: 'AOV', label: 'AOV (₹ Thousands)', stroke: '#f59e0b', fill: '#f59e0b' };
      case 'conversion': return { key: 'Conversion', label: 'Conversion Rate (%)', stroke: '#06b6d4', fill: '#06b6d4' };
      case 'revenue':
      default:
        return { key: 'Revenue', label: 'Revenue (₹ Lakh)', stroke: '#3b82f6', fill: '#3b82f6' };
    }
  };

  const currentMetricInfo = getMetricKey();

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Monthly Performance Trend Analysis
            </CardTitle>
            <CardDescription className="text-xs">
              Historical multi-month trajectory for revenue, gross profit, order count, AOV, and conversion.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 bg-accent/40 p-1 rounded-lg self-start sm:self-auto">
            <Button
              variant={timeframe === 'Month' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setTimeframe('Month')}
            >
              Month
            </Button>
            <Button
              variant={timeframe === 'Quarter' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setTimeframe('Quarter')}
            >
              Quarter
            </Button>
            <Button
              variant={timeframe === 'Year' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setTimeframe('Year')}
            >
              Year
            </Button>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2">
          <Button
            variant={metric === 'revenue' ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 text-xs border-border/60"
            onClick={() => setMetric('revenue')}
          >
            Revenue
          </Button>
          <Button
            variant={metric === 'profit' ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 text-xs border-border/60"
            onClick={() => setMetric('profit')}
          >
            Gross Profit
          </Button>
          <Button
            variant={metric === 'orders' ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 text-xs border-border/60"
            onClick={() => setMetric('orders')}
          >
            Orders Closed
          </Button>
          <Button
            variant={metric === 'aov' ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 text-xs border-border/60"
            onClick={() => setMetric('aov')}
          >
            Average Order Value
          </Button>
          <Button
            variant={metric === 'conversion' ? 'secondary' : 'outline'}
            size="sm"
            className="h-7 text-xs border-border/60"
            onClick={() => setMetric('conversion')}
          >
            Conversion Rate
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentMetricInfo.fill} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={currentMetricInfo.fill} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey={currentMetricInfo.key}
                name={currentMetricInfo.label}
                stroke={currentMetricInfo.stroke}
                fillOpacity={1}
                fill="url(#colorMetric)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
