
import React, { useState, useEffect } from 'react';
import { Plus, Package2, ShoppingCart, Search as SearchIcon, Filter, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import InventoryHeader from '@/components/inventory/InventoryHeader';
import InventoryTable from '@/components/inventory/InventoryTable';
import StoreSelector from '@/components/StoreSelector';
import { useDeleteItem } from '@/hooks/useItems';
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
import { useIsMobile } from '@/hooks/use-mobile';

export default function Inventory() {
  const { data: stores = [] } = useStores();
  const { data: categories = [] } = useCategories();
  const deleteItem = useDeleteItem();
  const { session } = useAuth();
  const isMobile = useIsMobile();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [storeFilter, setStoreFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);

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
  }, [searchTerm, storeFilter, categoryFilter, showLowStockOnly]);


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

  const lowStockItems = paginatedItems.filter(item => item.quantity_available < 10);

  // Mobile panels components
  const AlertsPanel = () => (
    <LowStockAlertsPanel />
  );

  const BulkPanel = () => (
    <BulkOperationsPanel 
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
    />
  );

  return (
    <ErrorBoundary>
      <div className="space-y-4 md:space-y-6">
        <InventoryHeader lowStockItems={lowStockItems} />

        {/* Mobile: Collapsible panels */}
        {isMobile ? (
          <div className="space-y-3">
            {/* Alerts banner for mobile */}
            {lowStockItems.length > 0 && (
              <Drawer open={alertsPanelOpen} onOpenChange={setAlertsPanelOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-12 text-left">
                    <span className="flex items-center gap-2">
                      <Package2 className="w-4 h-4 text-orange-400" />
                      {lowStockItems.length} Low Stock Alert{lowStockItems.length > 1 ? 's' : ''}
                    </span>
                    <Filter className="w-4 h-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Low Stock Alerts</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-6">
                    <AlertsPanel />
                  </div>
                </DrawerContent>
              </Drawer>
            )}

            {/* Bulk operations for mobile */}
            {selectedItems.length > 0 && (
              <Drawer open={bulkPanelOpen} onOpenChange={setBulkPanelOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-12">
                    <span className="flex items-center gap-2">
                      <Package2 className="w-4 h-4" />
                      {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''} Selected
                    </span>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Bulk Operations</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-6">
                    <BulkPanel />
                  </div>
                </DrawerContent>
              </Drawer>
            )}
          </div>
        ) : (
          /* Desktop: Side panels */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <AlertsPanel />
            </div>
            <div className="lg:col-span-2">
              <BulkPanel />
            </div>
          </div>
        )}

        <Card className="simple-card">
          <CardHeader className={`${isMobile ? 'pb-4' : ''} flex flex-row items-center justify-between`}>
            <CardTitle className="text-lg md:text-xl font-semibold">Product Database</CardTitle>
            
            {/* Mobile: Header actions */}
            {isMobile ? (
              <div className="flex gap-2">
                <ItemForm
                  trigger={
                    <Button size="sm" className="h-9 w-9 p-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  }
                />
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <SheetHeader>
                      <SheetTitle>Actions</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <ExportButton 
                        data={paginatedItems} 
                        filename="inventory" 
                        type="items"
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            ) : (
              /* Desktop: Header actions */
              <div className="flex gap-2">
                <ExportButton 
                  data={paginatedItems} 
                  filename="inventory" 
                  type="items"
                />
                <ItemForm
                  trigger={
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  }
                />
              </div>
            )}
          </CardHeader>
          
          <CardContent className={isMobile ? 'px-4 pb-4' : ''}>
            {/* Search and filters section */}
            <div className={`mb-6 space-y-4 ${isMobile ? 'space-y-3' : ''}`}>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items, variants, attributes, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border border-border bg-background text-foreground placeholder-muted-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${isMobile ? 'text-base' : ''}`}
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
