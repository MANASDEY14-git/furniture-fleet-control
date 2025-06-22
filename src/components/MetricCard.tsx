
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  description?: string;
  trend?: {
    value: number;
    label: string;
  };
}

export default function MetricCard({ title, value, icon, description, trend }: MetricCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className="text-blue-600">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        ) : trend ? (
          <p className="text-xs text-muted-foreground mt-1">
            <span className={trend.value >= 0 ? 'text-green-600' : 'text-red-600'}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>{' '}
            {trend.label}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
