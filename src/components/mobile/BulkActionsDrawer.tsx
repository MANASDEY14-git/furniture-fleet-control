import { Package, MoreHorizontal, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BulkActionsDrawerProps {
  selectedCount: number;
  onExpand: () => void;
}

export default function BulkActionsDrawer({ selectedCount, onExpand }: BulkActionsDrawerProps) {
  if (selectedCount === 0) return null;

  return (
    <Button
      variant="outline"
      onClick={onExpand}
      className="w-full justify-between h-14 px-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Package className="w-5 h-5 text-blue-600" />
          <Badge 
            variant="secondary" 
            className="absolute -top-2 -right-2 w-5 h-5 p-0 text-xs flex items-center justify-center bg-blue-600 text-white"
          >
            {selectedCount}
          </Badge>
        </div>
        <div className="text-left">
          <p className="font-medium text-blue-800 dark:text-blue-200">
            Bulk Operations
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
          </p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-blue-600" />
    </Button>
  );
}