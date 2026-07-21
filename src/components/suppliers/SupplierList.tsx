import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplierCard } from './SupplierCard';
import { Users } from 'lucide-react';

interface SupplierBalanceData {
  opening: number;
  openingType: string;
  debit: number;
  credit: number;
  balance: number;
}

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface SupplierListProps {
  suppliers: Supplier[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  getBalanceData: (supplierId: string) => SupplierBalanceData;
  isLoading: boolean;
  isMobile: boolean;
}

export function SupplierList({
  suppliers,
  selectedId,
  onSelect,
  getBalanceData,
  isLoading,
  isMobile,
}: SupplierListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-3 rounded-full bg-muted mb-3">
          <Users className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-0.5">No suppliers found</h3>
        <p className="text-xs text-muted-foreground">Try adjusting your filters</p>
      </div>
    );
  }

  const content = (
    <div className="space-y-1.5">
      {suppliers.map((supplier) => (
        <SupplierCard
          key={supplier.id}
          supplier={supplier}
          balanceData={getBalanceData(supplier.id)}
          isSelected={selectedId === supplier.id}
          onClick={() => onSelect(supplier.id)}
        />
      ))}
    </div>
  );

  // Mobile: no wrapper, parent handles scroll
  if (isMobile) {
    return content;
  }

  // Desktop: use ScrollArea
  return (
    <ScrollArea className="h-full pr-3">
      {content}
    </ScrollArea>
  );
}
