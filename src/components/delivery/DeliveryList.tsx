import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import DeliveryCard from './DeliveryCard';
import { useBulkMarkDelivered } from '@/hooks/useSalePaymentStatus';
import type { DeliveryEvent } from '@/types/erp';
import type { DeliveryTab } from './DeliveryTabs';

interface DeliveryListProps {
  deliveries: DeliveryEvent[];
  isLoading?: boolean;
  activeTab: DeliveryTab;
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function DeliveryList({
  deliveries,
  isLoading,
  activeTab,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
}: DeliveryListProps) {
  const bulkMarkDelivered = useBulkMarkDelivered();
  
  // Filter deliveries by tab and search
  const filteredDeliveries = useMemo(() => {
    return deliveries
      .filter((d) => d.status === activeTab)
      .filter((d) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          d.customer_name.toLowerCase().includes(query) ||
          d.order_number.toLowerCase().includes(query) ||
          d.customer_phone.includes(query)
        );
      });
  }, [deliveries, activeTab, searchQuery]);

  const handleBulkMarkDelivered = () => {
    const overdueIds = filteredDeliveries.map(d => d.id);
    bulkMarkDelivered.mutate(overdueIds);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Search skeleton */}
        <div className="px-3 py-2 shrink-0">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search - compact */}
      <div className="px-2 py-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customer or order..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Compact Overdue Alert Banner - max 48px */}
      {activeTab === 'overdue' && filteredDeliveries.length > 0 && (
        <div className="px-2 pb-1.5 shrink-0">
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 h-10 max-h-12">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="text-xs font-medium text-foreground truncate">
                {filteredDeliveries.length} overdue
              </span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs shrink-0 hover:bg-amber-500/20"
                  disabled={bulkMarkDelivered.isPending}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Mark All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark all as delivered?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark {filteredDeliveries.length} overdue {filteredDeliveries.length === 1 ? 'order' : 'orders'} as delivered. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkMarkDelivered}>
                    {bulkMarkDelivered.isPending ? 'Updating...' : 'Confirm'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Single Scroll Container - Cards with minimal spacing */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filteredDeliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No deliveries found</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                isSelected={selectedId === delivery.id}
                onClick={() => onSelect(delivery.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
