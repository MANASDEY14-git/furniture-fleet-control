import { AlertTriangle, Package, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CompactAlertBannerProps {
  alertCount: number;
  onExpand: () => void;
}

export default function CompactAlertBanner({ alertCount, onExpand }: CompactAlertBannerProps) {
  if (alertCount === 0) return null;

  return (
    <Button
      variant="outline"
      onClick={onExpand}
      className="w-full justify-between h-14 px-4 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 w-5 h-5 p-0 text-xs flex items-center justify-center"
          >
            {alertCount}
          </Badge>
        </div>
        <div className="text-left">
          <p className="font-medium text-orange-800 dark:text-orange-200">
            Low Stock Alert{alertCount > 1 ? 's' : ''}
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400">
            {alertCount} item{alertCount > 1 ? 's' : ''} need attention
          </p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-orange-600" />
    </Button>
  );
}