import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BOMStatusIndicatorProps {
  isActive: boolean;
  hasStockIssues?: boolean;
  hasValidationErrors?: boolean;
  lastCalculated?: string | null;
  componentCount: number;
  estimatedCost: number;
}

export function BOMStatusIndicator({ 
  isActive, 
  hasStockIssues = false, 
  hasValidationErrors = false,
  lastCalculated,
  componentCount,
  estimatedCost
}: BOMStatusIndicatorProps) {
  const getOverallStatus = () => {
    if (!isActive) {
      return {
        variant: 'secondary' as const,
        icon: XCircle,
        label: 'Inactive',
        description: 'This BOM is currently inactive and not in use.'
      };
    }
    
    if (hasValidationErrors) {
      return {
        variant: 'destructive' as const,
        icon: XCircle,
        label: 'Invalid',
        description: 'This BOM has validation errors that need to be resolved.'
      };
    }
    
    if (hasStockIssues) {
      return {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        label: 'Stock Issues',
        description: 'Some components have insufficient stock availability.'
      };
    }
    
    if (componentCount === 0) {
      return {
        variant: 'secondary' as const,
        icon: AlertTriangle,
        label: 'No Components',
        description: 'This BOM has no components defined.'
      };
    }
    
    return {
      variant: 'default' as const,
      icon: CheckCircle,
      label: 'Ready',
      description: 'This BOM is active and ready for production.'
    };
  };

  const getCostStatus = () => {
    if (estimatedCost <= 0) {
      return {
        variant: 'secondary' as const,
        label: 'No Cost Data',
        description: 'Cost calculation is missing or incomplete.'
      };
    }
    
    const isRecent = lastCalculated && 
      new Date().getTime() - new Date(lastCalculated).getTime() < 24 * 60 * 60 * 1000; // 24 hours
    
    if (!isRecent) {
      return {
        variant: 'outline' as const,
        label: 'Cost Outdated',
        description: 'Cost calculation may be outdated. Consider recalculating.'
      };
    }
    
    return {
      variant: 'default' as const,
      label: 'Cost Updated',
      description: 'Cost calculation is recent and up-to-date.'
    };
  };

  const status = getOverallStatus();
  const costStatus = getCostStatus();
  const StatusIcon = status.icon;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger>
            <Badge variant={status.variant} className="gap-1">
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{status.description}</p>
          </TooltipContent>
        </Tooltip>
        
        {estimatedCost > 0 && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant={costStatus.variant} className="gap-1">
                <Clock className="w-3 h-3" />
                ₹{estimatedCost.toFixed(2)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{costStatus.description}</p>
              {lastCalculated && (
                <p className="text-xs text-muted-foreground">
                  Last calculated: {new Date(lastCalculated).toLocaleDateString()}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}