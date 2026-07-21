import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  type: 'table' | 'cards' | 'list';
  rows?: number;
  cols?: number;
}

export function LoadingSkeleton({ type, rows = 10, cols = 6 }: LoadingSkeletonProps) {
  if (type === 'table') {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Table skeleton */}
        <div className="space-y-3">
          {/* Table header */}
          <div className="flex gap-4 p-4 rounded-lg bg-slate-800/30">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          
          {/* Table rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 rounded-lg bg-slate-800/30">
              <Skeleton className="h-4 w-4" />
              {Array.from({ length: cols - 1 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-3 p-4 rounded-lg bg-slate-800/30">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 rounded-lg bg-slate-800/30">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}