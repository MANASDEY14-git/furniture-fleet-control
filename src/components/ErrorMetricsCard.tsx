import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorMetricsCardProps {
  title: string;
  onRetry?: () => void;
}

export default function ErrorMetricsCard({ title, onRetry }: ErrorMetricsCardProps) {
  return (
    <Card className="futuristic-card border-orange-500/20">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-blue-200">{title}</p>
            <div className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Failed to load</span>
            </div>
          </div>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="text-orange-400 hover:text-orange-300"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}