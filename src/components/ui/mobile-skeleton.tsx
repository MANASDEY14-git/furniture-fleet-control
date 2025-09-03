import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MobileSkeletonCardProps {
  className?: string;
}

export function MobileSkeletonCard({ className }: MobileSkeletonCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-lg border bg-card animate-pulse",
      className
    )}>
      {/* Header with title and badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 bg-muted rounded-md w-3/4 mb-2"></div>
          <div className="h-4 bg-muted rounded-md w-1/2"></div>
        </div>
        <div className="h-6 w-16 bg-muted rounded-full ml-2"></div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-16"></div>
          <div className="h-4 bg-muted rounded w-12"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-20"></div>
          <div className="h-4 bg-muted rounded w-16"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-24"></div>
          <div className="h-4 bg-muted rounded w-20"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-18"></div>
          <div className="h-4 bg-muted rounded w-14"></div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <div className="h-9 bg-muted rounded flex-1"></div>
        <div className="h-9 w-9 bg-muted rounded"></div>
        <div className="h-9 w-9 bg-muted rounded"></div>
      </div>
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  className?: string;
}

export function MobileSkeletonGrid({ count = 6, className }: SkeletonGridProps) {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={{ animationDelay: `${index * 0.1}s` }}>
          <MobileSkeletonCard className="animate-fade-in" />
        </div>
      ))}
    </div>
  );
}