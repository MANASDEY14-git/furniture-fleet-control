import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  className?: string;
  loader?: React.ReactNode;
}

export function InfiniteScroll({
  children,
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 0.8,
  className,
  loader
}: InfiniteScrollProps) {
  const [loadingMore, setLoadingMore] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const { isIntersecting } = useIntersectionObserver(triggerRef, {
    threshold,
    rootMargin: '100px'
  });

  const handleLoadMore = useCallback(async () => {
    if (isLoading || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      await onLoadMore();
    } finally {
      setLoadingMore(false);
    }
  }, [isLoading, loadingMore, hasMore, onLoadMore]);

  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading && !loadingMore) {
      handleLoadMore();
    }
  }, [isIntersecting, hasMore, isLoading, loadingMore, handleLoadMore]);

  const defaultLoader = (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading more items...</span>
      </div>
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      {children}
      
      {hasMore && (
        <div 
          ref={triggerRef}
          className="w-full"
        >
          {(isLoading || loadingMore) && (loader || defaultLoader)}
        </div>
      )}
      
      {!hasMore && !isLoading && (
        <div className="text-center py-6 text-muted-foreground">
          <span className="text-sm">No more items to load</span>
        </div>
      )}
    </div>
  );
}