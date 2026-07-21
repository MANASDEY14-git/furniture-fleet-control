import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Store {
  id: string;
  name: string;
}

export interface FilterState {
  search: string;
  status: string;
  store: string;
  sort: string;
}

interface SupplierFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  stores: Store[];
  storesLoading: boolean;
  isMobile: boolean;
}

export function SupplierFilters({
  filters,
  onChange,
  stores,
  storesLoading,
  isMobile,
}: SupplierFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState(filters);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onChange]);

  // Sync temp filters when sheet opens
  useEffect(() => {
    if (sheetOpen) {
      setTempFilters(filters);
    }
  }, [sheetOpen, filters]);

  const activeFilterCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.store !== 'all' ? 1 : 0) +
    (filters.sort !== 'name' ? 1 : 0);

  const handleApplyFilters = () => {
    onChange({ ...tempFilters, search: searchInput });
    setSheetOpen(false);
  };

  const handleClearFilters = () => {
    const cleared = { search: '', status: 'all', store: 'all', sort: 'name' };
    setTempFilters(cleared);
    setSearchInput('');
    onChange(cleared);
    setSheetOpen(false);
  };

  // Mobile filter UI - compact
  if (isMobile) {
    return (
      <div className="flex gap-2 pt-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => {
                setSearchInput('');
                onChange({ ...filters, search: '' });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 relative shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[9px]"
                  variant="destructive"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>

            <div className="space-y-5 pb-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Store</Label>
                <Select
                  value={tempFilters.store}
                  onValueChange={(v) => setTempFilters({ ...tempFilters, store: v })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={storesLoading ? 'Loading...' : 'All Stores'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select
                  value={tempFilters.status}
                  onValueChange={(v) => setTempFilters({ ...tempFilters, status: v })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="high-due">High Due</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                    <SelectItem value="advance">Advance</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Sort By</Label>
                <Select
                  value={tempFilters.sort}
                  onValueChange={(v) => setTempFilters({ ...tempFilters, sort: v })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="balance-high">Balance (High to Low)</SelectItem>
                    <SelectItem value="balance-low">Balance (Low to High)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SheetFooter className="flex-row gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1 h-12" onClick={handleClearFilters}>
                Clear All
              </Button>
              <Button className="flex-1 h-12" onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop filter UI
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.store} onValueChange={(v) => onChange({ ...filters, store: v })}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={storesLoading ? 'Loading...' : 'All Stores'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stores</SelectItem>
          {stores.map((store) => (
            <SelectItem key={store.id} value={store.id}>
              {store.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v })}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="high-due">High Due</SelectItem>
          <SelectItem value="due">Due</SelectItem>
          <SelectItem value="advance">Advance</SelectItem>
          <SelectItem value="settled">Settled</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.sort} onValueChange={(v) => onChange({ ...filters, sort: v })}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Name (A-Z)</SelectItem>
          <SelectItem value="name-desc">Name (Z-A)</SelectItem>
          <SelectItem value="balance-high">Balance (High-Low)</SelectItem>
          <SelectItem value="balance-low">Balance (Low-High)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
