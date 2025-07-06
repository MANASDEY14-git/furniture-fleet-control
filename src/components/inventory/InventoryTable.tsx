
import React, { useState, useMemo } from 'react';
import { Pencil, Trash2, AlertTriangle, Search, Filter, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import ItemForm from '@/components/ItemForm';
import ItemVariantManager from '@/components/ItemVariantManager';
import { formatCurrency } from '@/utils/currencyUtils';
import type { Item } from '@/hooks/useItems';
import type { Store } from '@/types';
import type { Category } from '@/hooks/useCategories';

interface InventoryTableProps {
  items: Item[];
  stores: Store[];
  categories: Category[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedItems: string[];
  onItemSelection: (itemId: string, checked: boolean) => void;
  onDeleteItem: (id: string) => void;
  isLoading: boolean;
}

const calculateStockAge = (stockReceiveDate?: string) => {
  if (!stockReceiveDate) return 0;
  const receiveDate = new Date(stockReceiveDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - receiveDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getStockAgeStatus = (days: number) => {
  if (days > 180) return { status: 'Old Stock', color: 'text-red-400' };
  if (days > 90) return { status: 'Aging Stock', color: 'text-orange-400' };
  return { status: 'Fresh Stock', color: 'text-green-400' };
};

export default function InventoryTable({
  items,
  stores,
  categories,
  searchTerm,
  onSearchTermChange,
  selectedItems,
  onItemSelection,
  onDeleteItem,
  isLoading
}: InventoryTableProps) {
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price' | 'age'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterByStore, setFilterByStore] = useState<string>('all');
  const [filterByCategory, setFilterByCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stores.find(store => store.id === item.store_id)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        categories.find(cat => cat.id === item.category_id)?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStore = filterByStore === 'all' || item.store_id === filterByStore;
      const matchesCategory = filterByCategory === 'all' || item.category_id === filterByCategory;
      const matchesLowStock = !showLowStockOnly || item.quantity_available < 10;

      return matchesSearch && matchesStore && matchesCategory && matchesLowStock;
    });

    // Sort items
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = a.quantity_available - b.quantity_available;
          break;
        case 'price':
          comparison = a.selling_price - b.selling_price;
          break;
        case 'age':
          const ageA = calculateStockAge(a.stock_receive_date);
          const ageB = calculateStockAge(b.stock_receive_date);
          comparison = ageA - ageB;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [items, searchTerm, stores, categories, sortBy, sortOrder, filterByStore, filterByCategory, showLowStockOnly]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 rounded-lg bg-slate-800/30">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
            <Input
              placeholder="Search items, stores, categories..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="pl-10 neon-border bg-slate-800/50 text-blue-100"
            />
          </div>
          
          <Select value={sortBy} onValueChange={(value: 'name' | 'quantity' | 'price' | 'age') => setSortBy(value)}>
            <SelectTrigger className="w-32 neon-border bg-slate-800/50 text-blue-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-blue-500/30">
              <SelectItem value="name" className="text-blue-100">Name</SelectItem>
              <SelectItem value="quantity" className="text-blue-100">Quantity</SelectItem>
              <SelectItem value="price" className="text-blue-100">Price</SelectItem>
              <SelectItem value="age" className="text-blue-100">Age</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="text-cyan-400 border-cyan-400/50 hover:bg-cyan-900/20"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>

        <div className="flex gap-4">
          <Select value={filterByStore} onValueChange={setFilterByStore}>
            <SelectTrigger className="w-48 neon-border bg-slate-800/50 text-blue-100">
              <SelectValue placeholder="All stores" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-blue-500/30">
              <SelectItem value="all" className="text-blue-100">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id} className="text-blue-100">
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterByCategory} onValueChange={setFilterByCategory}>
            <SelectTrigger className="w-48 neon-border bg-slate-800/50 text-blue-100">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-blue-500/30">
              <SelectItem value="all" className="text-blue-100">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id} className="text-blue-100">
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="lowStock"
              checked={showLowStockOnly}
              onCheckedChange={(checked) => setShowLowStockOnly(checked as boolean)}
            />
            <label htmlFor="lowStock" className="text-sm text-blue-200 cursor-pointer">
              Low stock only
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="data-grid">
          <TableHeader>
            <TableRow className="border-blue-500/30">
              <TableHead className="text-blue-200 w-12">
                <Checkbox
                  checked={selectedItems.length === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const allItemIds = filteredAndSortedItems.map(item => item.id);
                      allItemIds.forEach(id => onItemSelection(id, true));
                    } else {
                      selectedItems.forEach(id => onItemSelection(id, false));
                    }
                  }}
                />
              </TableHead>
              <TableHead className="text-blue-200">Name</TableHead>
              <TableHead className="text-blue-200">Store</TableHead>
              <TableHead className="text-blue-200">Category</TableHead>
              <TableHead className="text-blue-200">Quantity</TableHead>
              <TableHead className="text-blue-200">Cost Price</TableHead>
              <TableHead className="text-blue-200">Selling Price</TableHead>
              <TableHead className="text-blue-200">Stock Age</TableHead>
              <TableHead className="text-right text-blue-200">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedItems.map((item) => {
              const store = stores.find(s => s.id === item.store_id);
              const category = categories.find(c => c.id === item.category_id);
              const isLowStock = item.quantity_available < 10;
              const stockAge = calculateStockAge(item.stock_receive_date);
              const stockAgeStatus = getStockAgeStatus(stockAge);
              
              return (
                <TableRow 
                  key={item.id} 
                  className={`border-blue-500/20 hover:bg-blue-800/20 transition-colors ${
                    isLowStock ? 'bg-orange-900/10' : ''
                  }`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => onItemSelection(item.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-blue-100 max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="truncate" title={item.name}>{item.name}</span>
                      {isLowStock && (
                        <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-blue-200">{store?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-blue-200">{category?.name || 'Unknown'}</TableCell>
                  <TableCell className={`${isLowStock ? 'text-orange-300 font-semibold' : 'text-blue-200'}`}>
                    {item.quantity_available}
                  </TableCell>
                  <TableCell className="text-blue-200">{formatCurrency(item.cost_price)}</TableCell>
                  <TableCell className="text-blue-200">{formatCurrency(item.selling_price)}</TableCell>
                  <TableCell className={stockAgeStatus.color}>
                    <div className="flex flex-col">
                      <span className="text-sm">{stockAge} days</span>
                      <span className="text-xs">{stockAgeStatus.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ItemVariantManager
                        item={item}
                        trigger={
                          <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300 hover:bg-green-900/20">
                            <Package className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <ItemForm
                        item={item}
                        trigger={
                          <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="futuristic-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-cyan-300">Delete Item</AlertDialogTitle>
                            <AlertDialogDescription className="text-blue-200">
                              Are you sure you want to delete "{item.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteItem(item.id)} className="bg-red-600 hover:bg-red-700 text-white">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredAndSortedItems.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-blue-300">No items found matching your criteria</p>
        </div>
      )}

      <div className="mt-4 text-sm text-blue-300">
        Showing {filteredAndSortedItems.length} of {items.length} items
        {showLowStockOnly && ` (low stock only)`}
      </div>
    </>
  );
}
