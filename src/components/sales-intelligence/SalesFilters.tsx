import React, { useState } from 'react';
import { Filter, Search, RotateCcw, ChevronDown, SlidersHorizontal, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { SalesIntelligenceFilters, SalespersonPerformance } from '@/hooks/useSalesIntelligence';

interface SalesFiltersProps {
  filters: SalesIntelligenceFilters;
  onChange: (newFilters: SalesIntelligenceFilters) => void;
  salespeople?: SalespersonPerformance[];
}

export function SalesFilters({ filters, onChange, salespeople = [] }: SalesFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const categories = [
    'Sofa', 'Dining', 'Wardrobe', 'Bed', 'Office Furniture', 'Mattress', 'Chairs', 'Storage'
  ];

  const brands = [
    'Royal Teak', 'Italian Luxe', 'ErgoComfort', 'Modern Living', 'SleepWell'
  ];

  const handleReset = () => {
    onChange({
      storeId: 'all',
      salespersonId: 'all',
      dateRange: 'this_month',
      categoryId: undefined,
      brand: undefined,
      customerType: undefined,
      minRevenue: undefined,
      maxRevenue: undefined,
      minMargin: undefined,
      maxMargin: undefined,
      minTargetPct: undefined,
      maxTargetPct: undefined,
      searchQuery: '',
    });
  };

  const hasActiveFilters = Boolean(
    (filters.salespersonId && filters.salespersonId !== 'all') ||
    (filters.storeId && filters.storeId !== 'all') ||
    filters.categoryId ||
    filters.brand ||
    filters.customerType ||
    filters.searchQuery ||
    filters.minMargin ||
    filters.minRevenue ||
    filters.minTargetPct
  );

  return (
    <div className="bg-card/70 backdrop-blur-md border border-border/50 rounded-xl p-4 space-y-3 shadow-sm">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search salesperson by name, role, branch, or top category..."
            value={filters.searchQuery || ''}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            className="pl-9 h-9 text-xs border-border/60 bg-background/50 focus:bg-background transition-colors"
          />
        </div>

        {/* Quick Filter Selects */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Salesperson Select */}
          <Select
            value={filters.salespersonId || 'all'}
            onValueChange={(val) => onChange({ ...filters, salespersonId: val })}
          >
            <SelectTrigger className="h-9 text-xs w-[160px] border-border/60 bg-background/50">
              <SelectValue placeholder="All Salespeople" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Salespeople</SelectItem>
              {salespeople.map((sp) => (
                <SelectItem key={sp.id} value={sp.id}>
                  {sp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Branch / Store Select */}
          <Select
            value={filters.storeId || 'all'}
            onValueChange={(val) => onChange({ ...filters, storeId: val })}
          >
            <SelectTrigger className="h-9 text-xs w-[160px] border-border/60 bg-background/50">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="1">Downtown Flagship</SelectItem>
              <SelectItem value="2">Suburban Outlet</SelectItem>
              <SelectItem value="3">Mall Experience Center</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Select */}
          <Select
            value={filters.dateRange || 'this_month'}
            onValueChange={(val: any) => onChange({ ...filters, dateRange: val })}
          >
            <SelectTrigger className="h-9 text-xs w-[140px] border-border/60 bg-background/50">
              <SelectValue placeholder="This Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
            </SelectContent>
          </Select>

          {/* Furniture Category Quick Filter */}
          <Select
            value={filters.categoryId || 'all'}
            onValueChange={(val) => onChange({ ...filters, categoryId: val === 'all' ? undefined : val })}
          >
            <SelectTrigger className="h-9 text-xs w-[150px] border-border/60 bg-background/50">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced Sliders Popover */}
          <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 text-xs gap-1.5 border-border/60 ${
                  showAdvanced || hasActiveFilters ? 'bg-primary/10 border-primary/40 text-primary' : ''
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-primary text-primary-foreground">
                    Active
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 p-4 space-y-4 border-border/60">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-primary" /> Advanced Threshold Filters
                </span>
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-6 text-[11px] px-2 text-muted-foreground">
                  Reset All
                </Button>
              </div>

              {/* Brand Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs">Brand Focus</Label>
                <Select
                  value={filters.brand || 'all'}
                  onValueChange={(val) => onChange({ ...filters, brand: val === 'all' ? undefined : val })}
                >
                  <SelectTrigger className="h-8 text-xs border-border/60">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Type */}
              <div className="space-y-1.5">
                <Label className="text-xs">Customer Segment</Label>
                <Select
                  value={filters.customerType || 'all'}
                  onValueChange={(val) => onChange({ ...filters, customerType: val === 'all' ? undefined : val })}
                >
                  <SelectTrigger className="h-8 text-xs border-border/60">
                    <SelectValue placeholder="All Customer Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customer Types</SelectItem>
                    <SelectItem value="New">New Customers</SelectItem>
                    <SelectItem value="Repeat">Repeat Customers</SelectItem>
                    <SelectItem value="Corporate">Corporate / Bulk</SelectItem>
                    <SelectItem value="VIP">VIP Residential</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Min Profit Margin Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span>Min Profit Margin</span>
                  <span className="font-medium text-primary">{filters.minMargin || 0}%</span>
                </div>
                <Slider
                  defaultValue={[filters.minMargin || 0]}
                  max={50}
                  step={2}
                  onValueChange={([val]) => onChange({ ...filters, minMargin: val > 0 ? val : undefined })}
                />
              </div>

              {/* Min Target Achievement Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span>Min Target Achievement</span>
                  <span className="font-medium text-primary">{filters.minTargetPct || 0}%</span>
                </div>
                <Slider
                  defaultValue={[filters.minTargetPct || 0]}
                  max={150}
                  step={5}
                  onValueChange={([val]) => onChange({ ...filters, minTargetPct: val > 0 ? val : undefined })}
                />
              </div>

              <Button
                size="sm"
                className="w-full text-xs h-8 bg-primary hover:bg-primary/90 mt-2"
                onClick={() => setShowAdvanced(false)}
              >
                Apply Filters
              </Button>
            </PopoverContent>
          </Popover>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
