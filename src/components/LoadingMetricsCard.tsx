import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingMetricsCardProps {
  title: string;
}

export default function LoadingMetricsCard({ title }: LoadingMetricsCardProps) {
  return (
    <Card className="futuristic-card">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-blue-200">{title}</p>
            <Skeleton className="h-8 w-24 bg-card-secondary" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full bg-card-secondary" />
        </div>
      </CardContent>
    </Card>
  );
}