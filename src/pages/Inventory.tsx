import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePaginatedItems } from '@/hooks/usePaginatedItems';
import { useInfiniteItems } from '@/hooks/useInfiniteItems';
import { useDeleteItem } from '@/hooks/useItems';
import { useStoreContext } from '@/contexts/StoreContext';
import { useCategories } from '@/hooks/useCategories';
import { useSuppliers } from '@/hooks/useSuppliers';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { InfiniteScroll } from '@/components/ui/infinite-scroll';
import { MobileSkeletonGrid } from '@/components/ui/mobile-skeleton';
import InventoryHeader from '@/components/inventory/InventoryHeader';
import InventoryTable from '@/components/inventory/InventoryTable';
import InventoryCard from '@/components/inventory/InventoryCard';
import LowStockAlertsPanel from '@/components/LowStockAlertsPanel';
import MobileBulkOperationsSheet from '@/components/mobile/MobileBulkOperationsSheet';
import CompactAlertBanner from '@/components/mobile/CompactAlertBanner';
import BulkActionsDrawer from '@/components/mobile/BulkActionsDrawer';
import MobileFloatingActionButton from '@/components/mobile/MobileFloatingActionButton';
import ItemForm from '@/components/ItemForm';
import { ErrorBoundary, QueryErrorFallback } from '@/components/ui/error-boundary';
import { useAuth } from '@/contexts/AuthContext';

export default function Inventory() {
  const { activeStoreId, accessibleStores } = useStoreContext();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const deleteItem = useDeleteItem();
  const { session } = useAuth();
  const isMobile = useIsMobile();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  // Use different hooks for mobile vs desktop
  const desktopQuery = usePaginatedItems({
    searchTerm,
    storeId: activeStoreId,
    categoryId: selectedCategory,
    supplierId: selectedSupplier,
    showLowStockOnly: showLowStock,
    pageSize: 50
  });

  const mobileQuery = useInfiniteItems({
    searchTerm,
    storeId: activeStoreId,
    categoryId: selectedCategory,
    supplierId: selectedSupplier,
    showLowStockOnly: showLowStock,
    pageSize: 20
  });

  // Use appropriate query based on device
  const {
    items,
    isLoading,
    refetch,
    pagination,
    goToPage
  } = isMobile ? {
    items: mobileQuery.items,
    isLoading: mobileQuery.isLoading,
    refetch: mobileQuery.refresh,
    pagination: undefined,
    goToPage: undefined
  } : {
    items: desktopQuery.items,
    isLoading: desktopQuery.isLoading,
    refetch: desktopQuery.refetch,
    pagination: desktopQuery.pagination,
    goToPage: desktopQuery.goToPage
  };

  const handleItemSelection = (itemId: string, checked: boolean) => {
    setSelectedItems(prev => 
      checked 
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  const lowStockItems = items.filter(item => item.quantity_available < 5);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">
            Please log in to view inventory
          </h2>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={QueryErrorFallback}>
      <div className="flex h-full bg-background">
        {/* Main Content */}
        <div className="flex-1 p-4 md:p-6 overflow-hidden">
          {isMobile ? (
            <PullToRefresh onRefresh={async () => { await refetch(); }}>
              <div className="space-y-4">
                {/* Mobile Header with Filters */}
                <InventoryHeader
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  selectedStore={selectedStore}
                  onStoreChange={setSelectedStore}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  selectedSupplier={selectedSupplier}
                  onSupplierChange={setSelectedSupplier}
                  showLowStock={showLowStock}
                  onShowLowStockChange={setShowLowStock}
                  stores={stores}
                  categories={categories}
                  suppliers={suppliers}
                  selectedItems={selectedItems}
                  onClearSelection={handleClearSelection}
                />

                {/* Mobile Alert Banner */}
                {lowStockItems.length > 0 && (
                  <CompactAlertBanner 
                    alertCount={lowStockItems.length}
                    onExpand={() => console.log('Expand alerts')}
                  />
                )}

                {/* Mobile Items with Infinite Scroll */}
                {isLoading ? (
                  <MobileSkeletonGrid count={6} />
                ) : (
                  <InfiniteScroll
                    hasMore={mobileQuery.hasMore}
                    isLoading={mobileQuery.isLoadingMore}
                    onLoadMore={mobileQuery.loadMore}
                  >
                    <div className="space-y-3">
                      {items.map((item) => {
                        const storeName = accessibleStores.find(store => store.id === item.store_id)?.name || 'Unknown Store';
                        const categoryName = categories.find(cat => cat.id === item.category_id)?.name || 'Unknown Category';
                        const isSelected = selectedItems.includes(item.id);

                        return (
                          <InventoryCard
                            key={item.id}
                            item={item}
                            isSelected={isSelected}
                            onSelectionChange={handleItemSelection}
                            onDeleteItem={handleDeleteItem}
                            storeName={storeName}
                            categoryName={categoryName}
                          />
                        );
                      })}
                    </div>
                  </InfiniteScroll>
                )}
              </div>
            </PullToRefresh>
          ) : (
            // Desktop Layout
            <div className="h-full flex flex-col">
              {/* Desktop Header with Add Button */}
              <div className="flex items-center justify-between mb-6">
                <InventoryHeader
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  selectedStore={selectedStore}
                  onStoreChange={setSelectedStore}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  selectedSupplier={selectedSupplier}
                  onSupplierChange={setSelectedSupplier}
                  showLowStock={showLowStock}
                  onShowLowStockChange={setShowLowStock}
                  stores={stores}
                  categories={categories}
                  suppliers={suppliers}
                  selectedItems={selectedItems}
                  onClearSelection={handleClearSelection}
                />
                <ItemForm 
                  trigger={
                    <button className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium inline-flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Add Item
                    </button>
                  }
                  onSuccess={() => {
                    refetch();
                  }}
                />
              </div>
              
              {/* Desktop Table */}
              <div className="flex-1 overflow-hidden">
                <InventoryTable
                  items={items}
                  stores={stores}
                  categories={categories}
                  selectedItems={selectedItems}
                  onItemSelection={handleItemSelection}
                  onDeleteItem={handleDeleteItem}
                  isLoading={isLoading}
                  pagination={pagination}
                  onPageChange={goToPage}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Drawers and FAB */}
        {isMobile && (
          <>
            {/* Bulk Actions Drawer */}
            {selectedItems.length > 0 && (
              <div className="fixed bottom-20 left-4 right-4 z-40">
                <BulkActionsDrawer 
                  selectedCount={selectedItems.length}
                  onExpand={() => setShowBulkActions(true)}
                />
              </div>
            )}
            
            {/* Floating Action Button */}
            <ItemForm 
              trigger={
                <MobileFloatingActionButton 
                  onClick={() => {}}
                />
              }
              onSuccess={() => {
                refetch();
              }}
            />
            
            {/* Bulk Operations Sheet */}
            <MobileBulkOperationsSheet
              isOpen={showBulkActions}
              onClose={() => setShowBulkActions(false)}
              selectedItems={selectedItems}
              items={items}
              onClearSelection={handleClearSelection}
            />
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}