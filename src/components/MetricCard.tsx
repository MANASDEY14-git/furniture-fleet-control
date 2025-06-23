
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
    <Card className="futuristic-card transition-all duration-300 hover:scale-105">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-blue-200">{title}</CardTitle>
        <div className="text-cyan-400 p-2 rounded-lg bg-cyan-400/10">
          {React.cloneElement(icon, { className: "w-5 h-5" })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-cyan-300 glow-text mb-2">{value}</div>
        {description ? (
          <p className="text-xs text-blue-300 opacity-80">
            {description}
          </p>
        ) : trend ? (
          <p className="text-xs text-blue-300 opacity-80">
            <span className={cn(
              "font-semibold",
              trend.value >= 0 ? 'text-green-400' : 'text-red-400'
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
