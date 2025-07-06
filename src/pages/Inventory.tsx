
import React, { useState, useEffect } from 'react';
import { Plus, Package2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InventoryHeader from '@/components/inventory/InventoryHeader';
import InventoryTable from '@/components/inventory/InventoryTable';
import { useItems, useDeleteItem } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useCategories } from '@/hooks/useCategories';
import ItemForm from '@/components/ItemForm';
import ExportButton from '@/components/ExportButton';
import LowStockAlertsPanel from '@/components/LowStockAlertsPanel';
import BulkOperationsPanel from '@/components/BulkOperationsPanel';
import { supabase } from '@/integrations/supabase/client';

export default function Inventory() {
  const { data: items = [], isLoading, refetch: refetchItems } = useItems();
  const { data: stores = [] } = useStores();
  const { data: categories = [] } = useCategories();
  const deleteItem = useDeleteItem();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Set up real-time subscriptions
  useEffect(() => {
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
        }
      )
      .subscribe();
    channels.push(salesChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [refetchItems]);

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
              data={items} 
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
          <InventoryTable
            items={items}
            stores={stores}
            categories={categories}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            selectedItems={selectedItems}
            onItemSelection={handleItemSelection}
            onDeleteItem={handleDeleteItem}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
