import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers, PieChart as PieChartIcon } from 'lucide-react';
import type { CategoryPerformance } from '@/hooks/useSalesIntelligence';

interface CategoryProductMixChartProps {
  categories?: CategoryPerformance[];
  title?: string;
  description?: string;
}

export function CategoryProductMixChart({
  categories = [],
  title = 'Product Mix Intelligence & Category Breakdown',
  description = 'Category-wise analysis of sales revenue, profit margin, and volume units'
}: CategoryProductMixChartProps) {
  if (!categories || categories.length === 0) return null;

  // Prepare data for Radar Chart
  const radarData = categories.map(cat => ({
    category: cat.category,
    RevenueScore: Math.min(Math.round(cat.revenue / 20000), 100),
    MarginPct: cat.avgMargin,
    UnitsSold: cat.units * 4,
  }));

  // Prepare data for Stacked Bar Chart
  const barData = categories.map(cat => ({
    category: cat.category,
    RevenueLakh: Number((cat.revenue / 100000).toFixed(2)),
    ProfitLakh: Number((cat.profit / 100000).toFixed(2)),
    Units: cat.units,
    AvgMargin: cat.avgMargin,
  }));

  const formatTooltipCurrency = (value: any) => [`₹${value} Lakh`, 'Amount'];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> {title}
            </CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Radar Chart */}
          <div className="bg-accent/20 rounded-xl p-4 border border-border/40 space-y-2">
            <h3 className="text-xs font-bold uppercase text-muted-foreground text-center">Category Strengths Radar</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="currentColor" className="text-border/60" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: 'currentColor', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Revenue Share" dataKey="RevenueScore" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                  <Radar name="Margin %" dataKey="MarginPct" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Stacked Bar Chart */}
          <div className="bg-accent/20 rounded-xl p-4 border border-border/40 space-y-2">
            <h3 className="text-xs font-bold uppercase text-muted-foreground text-center">Revenue & Gross Profit Stacked (₹ Lakh)</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="L" />
                  <Tooltip formatter={formatTooltipCurrency} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="RevenueLakh" name="Revenue (Lakh)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ProfitLakh" name="Gross Profit (Lakh)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
