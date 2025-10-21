
import React from 'react';
import { Search, Filter, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Store } from '@/hooks/useStores';
import type { Category } from '@/hooks/useCategories';
import type { Supplier } from '@/hooks/useSuppliers';

interface InventoryHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStore: string;
  onStoreChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedSupplier: string;
  onSupplierChange: (value: string) => void;
  showLowStock: boolean;
  onShowLowStockChange: (value: boolean) => void;
  stores: Store[];
  categories: Category[];
  suppliers: Supplier[];
  selectedItems: string[];
  onClearSelection: () => void;
}

export default function InventoryHeader({
  searchTerm,
  onSearchChange,
  selectedStore,
  onStoreChange,
  selectedCategory,
  onCategoryChange,
  selectedSupplier,
  onSupplierChange,
  showLowStock,
  onShowLowStockChange,
  stores,
  categories,
  suppliers,
  selectedItems,
  onClearSelection
}: InventoryHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4">
      {/* Title and selection info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        </div>
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedItems.length} selected
            </span>
            <button 
              onClick={onClearSelection}
              className="text-xs text-primary hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className={`${isMobile ? 'space-y-3' : 'flex items-center gap-4'}`}>
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className={`${isMobile ? 'grid grid-cols-2 gap-3' : 'flex items-center gap-4'}`}>
          {/* Store Filter */}
          <Select value={selectedStore} onValueChange={onStoreChange}>
            <SelectTrigger className={isMobile ? 'w-full' : 'w-[160px]'}>
              <SelectValue placeholder="All Stores" />
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

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className={isMobile ? 'w-full' : 'w-[160px]'}>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Supplier Filter */}
          <Select value={selectedSupplier} onValueChange={onSupplierChange}>
            <SelectTrigger className={isMobile ? 'w-full' : 'w-[160px]'}>
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Low Stock Toggle */}
          <div className={`flex items-center gap-2 ${isMobile ? 'col-span-2' : ''}`}>
            <Switch
              id="low-stock"
              checked={showLowStock}
              onCheckedChange={onShowLowStockChange}
            />
            <Label htmlFor="low-stock" className="text-sm">
              Show low stock only
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
