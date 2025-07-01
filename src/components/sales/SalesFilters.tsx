
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import StoreSelector from '@/components/StoreSelector';
import SupplierSelector from '@/components/SupplierSelector';
import DateFilterSelector from '@/components/DateFilterSelector';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

interface SalesFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedStore: string;
  setSelectedStore: (value: string) => void;
  selectedSupplier: string;
  setSelectedSupplier: (value: string) => void;
  dateFilter: DateFilter;
  setDateFilter: (value: DateFilter) => void;
  customDateRange: { from: Date; to: Date } | null;
  setCustomDateRange: (value: { from: Date; to: Date } | null) => void;
  stores: any[];
  storesLoading: boolean;
}

export default function SalesFilters({
  searchTerm,
  setSearchTerm,
  selectedStore,
  setSelectedStore,
  selectedSupplier,
  setSelectedSupplier,
  dateFilter,
  setDateFilter,
  customDateRange,
  setCustomDateRange,
  stores,
  storesLoading
}: SalesFiltersProps) {
  return (
    <Card className="futuristic-card">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
            <Input
              placeholder="Search order number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
            />
          </div>
          <StoreSelector 
            value={selectedStore} 
            onValueChange={setSelectedStore}
            stores={stores}
            isLoading={storesLoading}
            placeholder="All stores"
          />
          <SupplierSelector 
            value={selectedSupplier} 
            onValueChange={setSelectedSupplier}
            placeholder="All suppliers"
          />
          <DateFilterSelector
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
