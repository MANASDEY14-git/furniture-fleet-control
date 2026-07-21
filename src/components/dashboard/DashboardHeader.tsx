
import React from 'react';
import StoreSelector from '@/components/StoreSelector';
import DateFilterSelector from '@/components/DateFilterSelector';
import type { Store } from '@/types';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

interface DashboardHeaderProps {
  selectedStore: string;
  onStoreChange: (value: string) => void;
  stores: Store[];
  storesLoading: boolean;
  dateFilter: DateFilter;
  onDateFilterChange: (value: DateFilter) => void;
  customDateRange: { from: Date; to: Date } | null;
  onCustomDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export default function DashboardHeader({
  selectedStore,
  onStoreChange,
  stores,
  storesLoading,
  dateFilter,
  onDateFilterChange,
  customDateRange,
  onCustomDateRangeChange,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your store.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <StoreSelector 
          value={selectedStore}
          onValueChange={onStoreChange}
          stores={stores}
          isLoading={storesLoading}
          placeholder="Select store"
        />
        <DateFilterSelector
          dateFilter={dateFilter}
          onDateFilterChange={onDateFilterChange}
          customDateRange={customDateRange}
          onCustomDateRangeChange={onCustomDateRangeChange}
        />
      </div>
    </div>
  );
}
