import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Filter, X, RotateCcw, Calendar, SlidersHorizontal } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { InventoryIntelligenceFilters, InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

interface InventoryFiltersProps {
  filters: InventoryIntelligenceFilters;
  onChange: (filters: InventoryIntelligenceFilters) => void;
  items: InventoryIntelligenceItem[];
}

export function InventoryFilters({ filters, onChange, items }: InventoryFiltersProps) {
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();

  // Extract unique brands and warehouses from items list
  const uniqueBrands = Array.from(new Set(items.map(i => i.brand).filter(Boolean))) as string[];
  const uniqueWarehouses = Array.from(new Set(items.map(i => i.warehouse).filter(Boolean))) as string[];

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleClearAll = () => {
    onChange({
      storeId: filters.storeId,
      dateFrom: undefined,
      dateTo: undefined,
      categoryId: undefined,
      supplierId: undefined,
      brand: undefined,
      warehouse: undefined,
      ageBucket: undefined,
      priceMin: undefined,
      priceMax: undefined,
    });
  };

  const hasActiveFilters = Boolean(
    filters.dateFrom ||
    filters.dateTo ||
    filters.categoryId ||
    filters.supplierId ||
    filters.brand ||
    filters.warehouse ||
    filters.ageBucket ||
    filters.priceMin !== undefined ||
    filters.priceMax !== undefined
  );

  const filterControls = (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 items-end">
      {/* Category */}
      <div>
        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Category</Label>
        <Select
          value={filters.categoryId || 'all'}
          onValueChange={(val) => onChange({ ...filters, categoryId: val === 'all' ? undefined : val })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Supplier */}
      <div>
        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Supplier</Label>
        <Select
          value={filters.supplierId || 'all'}
          onValueChange={(val) => onChange({ ...filters, supplierId: val === 'all' ? undefined : val })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Brand */}
      <div>
        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Brand</Label>
        <Select
          value={filters.brand || 'all'}
          onValueChange={(val) => onChange({ ...filters, brand: val === 'all' ? undefined : val })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {uniqueBrands.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Warehouse */}
      <div>
        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Warehouse</Label>
        <Select
          value={filters.warehouse || 'all'}
          onValueChange={(val) => onChange({ ...filters, warehouse: val === 'all' ? undefined : val })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All Warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {uniqueWarehouses.map((w) => (
              <SelectItem key={w} value={w}>{w}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Age Bucket */}
      <div>
        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Stock Age</Label>
        <Select
          value={filters.ageBucket || 'all'}
          onValueChange={(val) => onChange({ ...filters, ageBucket: val === 'all' ? undefined : val })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock Ages</SelectItem>
            <SelectItem value="Healthy">Healthy (0-180d)</SelectItem>
            <SelectItem value="Watch">Watch (181-270d)</SelectItem>
            <SelectItem value="Slow Moving">Slow Moving (271-365d)</SelectItem>
            <SelectItem value="Dead Stock">Dead Stock (366-540d)</SelectItem>
            <SelectItem value="Critical">Critical (&gt;540d)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date From */}
      <div>
        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Date From</Label>
        <Input
          type="date"
          value={filters.dateFrom || ''}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
          className="h-8 text-xs"
        />
      </div>

      {/* Date To */}
      <div>
        <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">Date To</Label>
        <Input
          type="date"
          value={filters.dateTo || ''}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
          className="h-8 text-xs"
        />
      </div>

      {/* Clear Button */}
      <div className="flex items-center gap-1">
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-8 text-xs px-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 w-full"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-card border rounded-xl p-3 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Filter Intelligence View</span>
        </div>

        {/* Mobile trigger */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Filter className="h-3.5 w-3.5" />
                Filters {hasActiveFilters && '•'}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl p-4 max-h-[85vh] overflow-y-auto">
              <SheetHeader className="pb-3 border-b mb-3">
                <SheetTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Filter Intelligence</span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-7 text-xs text-rose-500">
                      Reset
                    </Button>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                {filterControls}
                <Button className="w-full h-9" onClick={() => setMobileOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop inline controls */}
      <div className="hidden md:block pt-1">
        {filterControls}
      </div>
    </div>
  );
}
