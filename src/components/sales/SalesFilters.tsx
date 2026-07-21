
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import SupplierSelector from '@/components/SupplierSelector';
import DateFilterSelector from '@/components/DateFilterSelector';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

interface SalesFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedSupplier: string;
  setSelectedSupplier: (value: string) => void;
  dateFilter: DateFilter;
  setDateFilter: (value: DateFilter) => void;
  customDateRange: { from: Date; to: Date } | null;
  setCustomDateRange: (value: { from: Date; to: Date } | null) => void;
}

export default function SalesFilters({
  searchTerm,
  setSearchTerm,
  selectedSupplier,
  setSelectedSupplier,
  dateFilter,
  setDateFilter,
  customDateRange,
  setCustomDateRange,
}: SalesFiltersProps) {
  const isMobile = useIsMobile();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedSupplier && selectedSupplier !== 'all') count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search order # or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-foreground text-base">Filters</CardTitle>
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </div>
                  {isFiltersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-4">
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
                
                {activeFiltersCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedSupplier('all');
                      setDateFilter('today');
                      setCustomDateRange(null);
                    }}
                    className="w-full"
                  >
                    Clear All Filters
                  </Button>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <Badge variant="secondary">
                Search: {searchTerm}
              </Badge>
            )}
            {selectedSupplier && selectedSupplier !== 'all' && (
              <Badge variant="secondary">
                Supplier: {selectedSupplier}
              </Badge>
            )}
            {dateFilter && dateFilter !== 'today' && (
              <Badge variant="secondary">
                Date: {dateFilter}
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search order # or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
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
