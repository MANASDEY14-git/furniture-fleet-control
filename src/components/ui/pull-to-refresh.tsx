import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  disabled = false,
  className 
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [startY, setStartY] = useState(0);
  const [canPull, setCanPull] = useState(false);
  const isMobile = useIsMobile();

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  // Haptic feedback helper
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    
    if (scrollTop === 0) {
      setStartY(touch.clientY);
      setCanPull(true);
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canPull || disabled || isRefreshing) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const diff = currentY - startY;

    if (diff > 0) {
      e.preventDefault();
      const newPullDistance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(newPullDistance);

      // Haptic feedback at threshold
      if (newPullDistance >= PULL_THRESHOLD && pullDistance < PULL_THRESHOLD) {
        hapticFeedback('medium');
      }
    }
  }, [canPull, disabled, isRefreshing, startY, pullDistance, hapticFeedback]);

  const handleTouchEnd = useCallback(async () => {
    if (!canPull || disabled) return;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      hapticFeedback('heavy');
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    setCanPull(false);
    setStartY(0);
  }, [canPull, disabled, pullDistance, isRefreshing, onRefresh, hapticFeedback]);

  // Don't render on desktop
  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const shouldTrigger = pullDistance >= PULL_THRESHOLD;

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200",
          "bg-background/95 backdrop-blur-sm border-b",
          pullDistance > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: `${Math.min(pullDistance, MAX_PULL)}px`,
          transform: `translateY(-${MAX_PULL - Math.min(pullDistance, MAX_PULL)}px)`
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw 
            className={cn(
              "w-5 h-5 transition-all duration-200",
              isRefreshing && "animate-spin",
              shouldTrigger && !isRefreshing && "text-primary"
            )}
            style={{
              transform: `rotate(${pullProgress * 180}deg)`
            }}
          />
          <span className="text-sm font-medium">
            {isRefreshing 
              ? "Refreshing..." 
              : shouldTrigger 
                ? "Release to refresh" 
                : "Pull to refresh"
            }
          </span>
        </div>
      </div>

      {/* Content */}
      <div 
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
}