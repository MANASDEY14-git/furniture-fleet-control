
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
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

export default function Inventory() {
  const { data: items = [], isLoading } = useItems();
  const { data: stores = [] } = useStores();
  const { data: categories = [] } = useCategories();
  const deleteItem = useDeleteItem();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

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
