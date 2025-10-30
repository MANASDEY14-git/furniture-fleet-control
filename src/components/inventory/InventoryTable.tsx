import React, { useState, useMemo } from 'react';
import { Pencil, Trash2, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { PaginationControls } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import ItemForm from '@/components/ItemForm';
import InventoryCard from '@/components/inventory/InventoryCard';
import VariantStockTable from '@/components/inventory/VariantStockTable';
import { formatCurrency } from '@/utils/currencyUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useItemVariants } from '@/hooks/useItemVariants';
import type { Item } from '@/hooks/useItems';
import type { Store } from '@/types';
import type { Category } from '@/hooks/useCategories';

interface InventoryTableProps {
  items: Item[];
  stores: Store[];
  categories: Category[];
  selectedItems: string[];
  onItemSelection: (itemId: string, checked: boolean) => void;
  onDeleteItem: (id: string) => void;
  isLoading: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    startItem: number;
    endItem: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  onPageChange?: (page: number) => void;
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

// Item row component with variant expansion
function ItemRowWithVariants({
  item,
  store,
  category,
  isLowStock,
  stockAge,
  stockAgeStatus,
  isExpanded,
  isSelected,
  onItemSelection,
  onToggleExpand,
  onDeleteItem
}: {
  item: Item;
  store?: Store;
  category?: Category;
  isLowStock: boolean;
  stockAge: number;
  stockAgeStatus: { status: string; color: string };
  isExpanded: boolean;
  isSelected: boolean;
  onItemSelection: (id: string, checked: boolean) => void;
  onToggleExpand: (id: string) => void;
  onDeleteItem: (id: string) => void;
}) {
  const { data: variants = [] } = useItemVariants(item.id);
  const hasVariants = variants.length > 0;
  const totalStock = hasVariants 
    ? item.quantity_available + variants.reduce((sum, v) => sum + v.quantity_available, 0)
    : item.quantity_available;

  return (
    <>
      <TableRow 
        className={`border-blue-500/20 hover:bg-blue-800/20 transition-colors ${
          isLowStock ? 'bg-orange-900/10' : ''
        }`}
      >
        <TableCell>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onItemSelection(item.id, checked as boolean)}
          />
        </TableCell>
        <TableCell className="font-medium text-blue-100 max-w-xs">
          <div className="flex items-center gap-2">
            {hasVariants && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                onClick={() => onToggleExpand(item.id)}
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </Button>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="truncate" title={item.name}>{item.name}</span>
                {isLowStock && (
                  <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                )}
              </div>
              {hasVariants && (
                <Badge variant="secondary" className="text-xs mt-1 w-fit">
                  {variants.length} variant{variants.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-blue-200">{store?.name || 'Unknown'}</TableCell>
        <TableCell className="text-blue-200">{category?.name || 'Unknown'}</TableCell>
        <TableCell className={`${isLowStock ? 'text-orange-300 font-semibold' : 'text-blue-200'}`}>
          {hasVariants ? (
            <div className="flex flex-col">
              <span>{totalStock}</span>
              <span className="text-xs text-blue-400">({item.quantity_available} + {variants.reduce((sum, v) => sum + v.quantity_available, 0)})</span>
            </div>
          ) : (
            totalStock
          )}
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
      {isExpanded && hasVariants && (
        <VariantStockTable variants={variants} />
      )}
    </>
  );
}

export default function InventoryTable({
  items,
  stores,
  categories,
  selectedItems,
  onItemSelection,
  onDeleteItem,
  isLoading,
  pagination,
  onPageChange
}: InventoryTableProps) {
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price' | 'age'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    
    sorted.sort((a, b) => {
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

    return sorted;
  }, [items, sortBy, sortOrder]);

  if (isLoading) {
    return <LoadingSkeleton type="table" rows={10} cols={8} />;
  }

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-blue-300">Total Items: {sortedItems.length}</p>
        </div>
        
        <div className="space-y-3">
          {sortedItems.map((item) => {
            const storeName = stores.find(store => store.id === item.store_id)?.name || 'Unknown Store';
            const categoryName = categories.find(cat => cat.id === item.category_id)?.name || 'Unknown Category';
            const isSelected = selectedItems.includes(item.id);

            return (
              <InventoryCard
                key={item.id}
                item={item}
                isSelected={isSelected}
                onSelectionChange={onItemSelection}
                onDeleteItem={onDeleteItem}
                storeName={storeName}
                categoryName={categoryName}
              />
            );
          })}
        </div>

        {sortedItems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-blue-300">No items found matching your criteria</p>
          </div>
        )}

        {pagination && onPageChange && (
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
            startItem={pagination.startItem}
            endItem={pagination.endItem}
            totalItems={pagination.totalItems}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
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
      </div>

      <div className="overflow-x-auto">
        <Table className="data-grid">
          <TableHeader>
            <TableRow className="border-blue-500/30">
              <TableHead className="text-blue-200 w-12">
                <Checkbox
                  checked={selectedItems.length === sortedItems.length && sortedItems.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const allItemIds = sortedItems.map(item => item.id);
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
              <TableHead className="text-blue-200">Total Stock</TableHead>
              <TableHead className="text-blue-200">Cost Price</TableHead>
              <TableHead className="text-blue-200">Selling Price</TableHead>
              <TableHead className="text-blue-200">Stock Age</TableHead>
              <TableHead className="text-right text-blue-200">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => {
              const store = stores.find(s => s.id === item.store_id);
              const category = categories.find(c => c.id === item.category_id);
              const isLowStock = item.quantity_available < 1;
              const stockAge = calculateStockAge(item.stock_receive_date);
              const stockAgeStatus = getStockAgeStatus(stockAge);
              const isExpanded = expandedItems.has(item.id);
              
              return (
                <ItemRowWithVariants
                  key={item.id}
                  item={item}
                  store={store}
                  category={category}
                  isLowStock={isLowStock}
                  stockAge={stockAge}
                  stockAgeStatus={stockAgeStatus}
                  isExpanded={isExpanded}
                  isSelected={selectedItems.includes(item.id)}
                  onItemSelection={onItemSelection}
                  onToggleExpand={toggleExpand}
                  onDeleteItem={onDeleteItem}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>

      {sortedItems.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-blue-300">No items found matching your criteria</p>
        </div>
      )}

      {pagination && onPageChange && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
          startItem={pagination.startItem}
          endItem={pagination.endItem}
          totalItems={pagination.totalItems}
        />
      )}

      {!pagination && (
        <div className="mt-4 text-sm text-blue-300">
          Showing {sortedItems.length} of {items.length} items
        </div>
      )}
    </>
  );
}
