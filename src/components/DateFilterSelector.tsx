
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

interface DateFilterSelectorProps {
  value: DateFilter;
  onValueChange: (value: DateFilter) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (startDate: string, endDate: string) => void;
}

export default function DateFilterSelector({
  value,
  onValueChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
}: DateFilterSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Time Period</Label>
        <Select value={value} onValueChange={onValueChange}>
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
      
      {value === 'custom' && onCustomDateChange && (
        <div className="flex gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">From</Label>
            <Input
              id="startDate"
              type="date"
              value={customStartDate || ''}
              onChange={(e) => onCustomDateChange(e.target.value, customEndDate || '')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">To</Label>
            <Input
              id="endDate"
              type="date"
              value={customEndDate || ''}
              onChange={(e) => onCustomDateChange(customStartDate || '', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
