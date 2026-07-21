import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
    <Card className="transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-primary p-2 rounded-lg bg-primary/10">
          {React.cloneElement(icon, { className: "w-5 h-5" })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-2">{value}</div>
        {description ? (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : trend ? (
          <p className="text-xs text-muted-foreground">
            <span className={cn(
              "font-semibold",
              trend.value >= 0 ? 'text-green-600' : 'text-red-500'
            )}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </span>{' '}
            {trend.label}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
