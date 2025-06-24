
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

interface DateFilterSelectorProps {
  dateFilter: DateFilter;
  onDateFilterChange: (value: DateFilter) => void;
  customDateRange?: { from: Date; to: Date } | null;
  onCustomDateRangeChange?: (range: { from: Date; to: Date }) => void;
}

export default function DateFilterSelector({
  dateFilter,
  onDateFilterChange,
  customDateRange,
  onCustomDateRangeChange,
}: DateFilterSelectorProps) {
  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    if (!onCustomDateRangeChange) return;
    
    const newDate = new Date(value);
    const currentRange = customDateRange || { from: new Date(), to: new Date() };
    
    onCustomDateRangeChange({
      ...currentRange,
      [field]: newDate
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Time Period</Label>
        <Select value={dateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {dateFilter === 'custom' && onCustomDateRangeChange && (
        <div className="flex gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">From</Label>
            <Input
              id="startDate"
              type="date"
              value={customDateRange?.from.toISOString().split('T')[0] || ''}
              onChange={(e) => handleCustomDateChange('from', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">To</Label>
            <Input
              id="endDate"
              type="date"
              value={customDateRange?.to.toISOString().split('T')[0] || ''}
              onChange={(e) => handleCustomDateChange('to', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
