
import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import StoreSelector from '@/components/StoreSelector';
import ItemForm from '@/components/ItemForm';
import { useItems, useDeleteItem } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useCategories } from '@/hooks/useCategories';

export default function Inventory() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: categories = [] } = useCategories();
  const deleteItem = useDeleteItem();

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesStore = selectedStore === 'all' || item.store_id === selectedStore;
      const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStore && matchesCategory && matchesSearch;
    });
  }, [items, selectedStore, selectedCategory, searchTerm]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(category => category.id === categoryId)?.name || 'Unknown Category';
  };

  const getTotalValue = () => {
    return filteredItems.reduce((sum, item) => sum + (item.quantity_available * item.cost_price), 0);
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItem.mutate(itemId);
  };

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Inventory Control</h1>
          <p className="text-blue-300">Manage your furniture inventory</p>
        </div>
        <ItemForm 
          trigger={
            <Button className="cyber-button text-white font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          }
        />
      </div>

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>
            <StoreSelector 
              value={selectedStore} 
              onValueChange={setSelectedStore}
              stores={stores}
              isLoading={storesLoading}
            />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/30">
                <SelectItem value="all" className="text-blue-100 focus:bg-blue-800/30">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id} className="text-blue-100 focus:bg-blue-800/30">
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center neon-border bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-md px-4 py-2">
              <span className="text-sm font-medium text-cyan-300 glow-text">
                Total Value: ${getTotalValue().toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">Inventory Database ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Item Name</TableHead>
                  <TableHead className="text-blue-200">Category</TableHead>
                  <TableHead className="text-blue-200">Store</TableHead>
                  <TableHead className="text-right text-blue-200">Quantity</TableHead>
                  <TableHead className="text-right text-blue-200">Cost Price</TableHead>
                  <TableHead className="text-right text-blue-200">Selling Price</TableHead>
                  <TableHead className="text-right text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="font-medium text-blue-100">{item.name}</TableCell>
                    <TableCell className="text-blue-200">{getCategoryName(item.category_id)}</TableCell>
                    <TableCell className="text-blue-200">{getStoreName(item.store_id)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.quantity_available > 10 
                          ? 'bg-green-400/20 text-green-300 border border-green-400/30'
                          : item.quantity_available > 5
                          ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                          : 'bg-red-400/20 text-red-300 border border-red-400/30'
                      }`}>
                        {item.quantity_available}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-cyan-300">${item.cost_price}</TableCell>
                    <TableCell className="text-right text-cyan-300 font-semibold">${item.selling_price}</TableCell>
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
                              <AlertDialogAction 
                                onClick={() => handleDeleteItem(item.id)}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No items found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
