
import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
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

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stores.find(store => store.id === item.store_id)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categories.find(cat => cat.id === item.category_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = items.filter(item => item.quantity_available < 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="w-8 h-8 text-cyan-400" />
        <div>
          <h1 className="text-3xl font-bold glow-text">Inventory Control</h1>
          <p className="text-blue-300">Manage your product inventory</p>
        </div>
      </div>

      {/* Alerts Panel */}
      {lowStockItems.length > 0 && (
        <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <h3 className="text-orange-300 font-semibold">Low Stock Alert</h3>
          </div>
          <p className="text-orange-200 text-sm">
            {lowStockItems.length} item(s) are running low on stock (less than 10 units)
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <div className="lg:col-span-1">
          <LowStockAlertsPanel />
        </div>

        {/* Bulk Operations */}
        <div className="lg:col-span-2">
          <BulkOperationsPanel 
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
          />
        </div>
      </div>

      {/* Main Inventory Table */}
      <Card className="futuristic-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-cyan-300 glow-text">Product Database</CardTitle>
          <div className="flex gap-2">
            <ExportButton 
              data={filteredItems} 
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
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100 max-w-md"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-blue-300">Loading inventory...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200 w-12">
                      <Checkbox
                        checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItems(filteredItems.map(item => item.id));
                          } else {
                            setSelectedItems([]);
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
                    <TableHead className="text-right text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const store = stores.find(s => s.id === item.store_id);
                    const category = categories.find(c => c.id === item.category_id);
                    const isLowStock = item.quantity_available < 10;
                    
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
                            onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-blue-100">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {isLowStock && (
                              <AlertTriangle className="w-4 h-4 text-orange-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-blue-200">{store?.name || 'Unknown'}</TableCell>
                        <TableCell className="text-blue-200">{category?.name || 'Unknown'}</TableCell>
                        <TableCell className={`${isLowStock ? 'text-orange-300 font-semibold' : 'text-blue-200'}`}>
                          {item.quantity_available}
                        </TableCell>
                        <TableCell className="text-blue-200">${item.cost_price.toLocaleString()}</TableCell>
                        <TableCell className="text-blue-200">${item.selling_price.toLocaleString()}</TableCell>
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
                                  <AlertDialogAction onClick={() => handleDeleteItem(item.id)} className="bg-red-600 hover:bg-red-700 text-white">
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
          )}
          
          {filteredItems.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <p className="text-blue-300">No items found. Add your first item above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
