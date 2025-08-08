
import React, { useState, useEffect } from 'react';
import { Plus, Package2, ShoppingCart, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InventoryHeader from '@/components/inventory/InventoryHeader';
import InventoryTable from '@/components/inventory/InventoryTable';

import StoreSelector from '@/components/StoreSelector';
import { useItems, useDeleteItem } from '@/hooks/useItems';
import { usePaginatedItems } from '@/hooks/usePaginatedItems';
import { useStores } from '@/hooks/useStores';
import { useCategories } from '@/hooks/useCategories';
import ItemForm from '@/components/ItemForm';
import ExportButton from '@/components/ExportButton';
import LowStockAlertsPanel from '@/components/LowStockAlertsPanel';
import BulkOperationsPanel from '@/components/BulkOperationsPanel';
import { ErrorBoundary, QueryErrorFallback } from '@/components/ui/error-boundary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Inventory() {
  const { data: items = [], isLoading, refetch: refetchItems } = useItems();
  const { data: stores = [] } = useStores();
  const { data: categories = [] } = useCategories();
  const deleteItem = useDeleteItem();
  const { session } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [storeFilter, setStoreFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Use paginated items for better performance
  const {
    items: paginatedItems,
    isLoading: isPaginatedLoading,
    error: paginatedError,
    pagination,
    goToPage,
    resetToFirstPage,
    refetch: refetchPaginated
  } = usePaginatedItems({
    pageSize: 25,
    searchTerm,
    storeId: storeFilter,
    categoryId: categoryFilter,
    showLowStockOnly
  });

  // Reset to first page when filters change
  useEffect(() => {
    resetToFirstPage();
  }, [searchTerm, storeFilter, categoryFilter, showLowStockOnly, resetToFirstPage]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!session?.user) return;
    const channels: any[] = [];

    // Subscribe to items changes
    const itemsChannel = supabase
      .channel('inventory-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        () => {
          console.log('Items changed, refreshing inventory...');
          refetchItems();
          refetchPaginated();
        }
      )
      .subscribe();
    channels.push(itemsChannel);

    // Subscribe to purchases changes (affects inventory)
    const purchasesChannel = supabase
      .channel('inventory-purchases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases'
        },
        () => {
          console.log('Purchases changed, refreshing inventory...');
          refetchItems();
          refetchPaginated();
        }
      )
      .subscribe();
    channels.push(purchasesChannel);

    // Subscribe to sales changes (affects inventory)
    const salesChannel = supabase
      .channel('inventory-sales-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales'
        },
        () => {
          console.log('Sales changed, refreshing inventory...');
          refetchItems();
          refetchPaginated();
        }
      )
      .subscribe();
    channels.push(salesChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [session, refetchItems, refetchPaginated]);

  const handleDeleteItem = (id: string) => {
    deleteItem.mutate(id);
  };

  const handleItemSelection = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
    }
  };

  const lowStockItems = items.filter(item => item.quantity_available < 10);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <InventoryHeader lowStockItems={lowStockItems} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <LowStockAlertsPanel />
          </div>

          <div className="lg:col-span-2">
            <BulkOperationsPanel 
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
            />
          </div>
        </div>

        <Card className="futuristic-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-cyan-300 glow-text">Product Database</CardTitle>
            <div className="flex gap-2">
              <ExportButton 
                data={paginatedItems} 
                filename="inventory" 
                type="items"
              />
              <ItemForm
                trigger={
                  <Button className="cyber-button text-white font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                }
              />
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and filters section */}
            <div className="mb-6 space-y-4">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items, variants, attributes, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 neon-border bg-slate-800/50 text-blue-100 placeholder-blue-300/50 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
              
              <div className="flex gap-4 flex-wrap">
                <StoreSelector
                  value={storeFilter}
                  onValueChange={setStoreFilter}
                  stores={stores}
                  placeholder="All stores"
                />
              </div>
            </div>
            {paginatedError ? (
              <QueryErrorFallback 
                error={paginatedError} 
                retry={refetchPaginated} 
              />
            ) : (
              <InventoryTable
                items={paginatedItems}
                stores={stores}
                categories={categories}
                selectedItems={selectedItems}
                onItemSelection={handleItemSelection}
                onDeleteItem={handleDeleteItem}
                isLoading={isPaginatedLoading}
                pagination={pagination}
                onPageChange={goToPage}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
