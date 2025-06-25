
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SupplierSelector from '@/components/SupplierSelector';
import StoreSelector from '@/components/StoreSelector';
import SupplierForm from '@/components/SupplierForm';
import { useItems } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventorySupplier() {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSupplier = !selectedSupplier || item.supplier_id === selectedSupplier;
      const matchesStore = !selectedStore || item.store_id === selectedStore;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSupplier && matchesStore && matchesSearch;
    });
  }, [items, selectedSupplier, selectedStore, searchTerm]);

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.name || 'No Supplier';
  };

  const getStoreName = (storeId: string) => {
    return stores.find(s => s.id === storeId)?.name || 'Unknown Store';
  };

  const getTotalStockValue = () => {
    return filteredItems.reduce((sum, item) => sum + (item.quantity_available * item.cost_price), 0);
  };

  if (itemsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Inventory by Outlet + Supplier</h1>
          <p className="text-blue-300">Filter: Outlet + Supplier - Show items by selected supplier at selected outlet</p>
        </div>
        <SupplierForm
          trigger={
            <Button className="cyber-button text-white font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          }
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-cyan-300">
                {filteredItems.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Quantity</p>
              <p className="text-2xl font-bold text-cyan-300">
                {filteredItems.reduce((sum, item) => sum + item.quantity_available, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Stock Value</p>
              <p className="text-2xl font-bold text-cyan-300">
                ₹{getTotalStockValue().toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Outlet + Supplier as requested */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">
            Filter: Outlet + Supplier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              isLoading={false}
              placeholder="Select Outlet"
            />
            <SupplierSelector 
              value={selectedSupplier} 
              onValueChange={setSelectedSupplier}
              placeholder="Select Supplier"
            />
          </div>
          {selectedStore && selectedSupplier && (
            <div className="mt-4 p-3 bg-blue-800/20 rounded-md border border-blue-500/30">
              <p className="text-blue-200">
                Showing items from <span className="text-cyan-300 font-semibold">{getSupplierName(selectedSupplier)}</span> at{' '}
                <span className="text-cyan-300 font-semibold">{getStoreName(selectedStore)}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Table - Show items belonging to selected supplier at selected outlet */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">
            Items by Supplier at Outlet ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Item Name</TableHead>
                  <TableHead className="text-blue-200">Store (Outlet)</TableHead>
                  <TableHead className="text-blue-200">Supplier</TableHead>
                  <TableHead className="text-right text-blue-200">Quantity</TableHead>
                  <TableHead className="text-right text-blue-200">Cost Price</TableHead>
                  <TableHead className="text-right text-blue-200">Selling Price</TableHead>
                  <TableHead className="text-right text-blue-200">Stock Value</TableHead>
                  <TableHead className="text-right text-blue-200">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const stockValue = item.quantity_available * item.cost_price;
                  const margin = ((item.selling_price - item.cost_price) / item.cost_price * 100);
                  
                  return (
                    <TableRow key={item.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                      <TableCell className="font-medium text-blue-100">{item.name}</TableCell>
                      <TableCell className="text-blue-200">{getStoreName(item.store_id || '')}</TableCell>
                      <TableCell className="text-blue-200">{getSupplierName(item.supplier_id || '')}</TableCell>
                      <TableCell className="text-right text-cyan-300">{item.quantity_available}</TableCell>
                      <TableCell className="text-right text-blue-200">₹{item.cost_price.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right text-cyan-300">₹{item.selling_price.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right text-cyan-300 font-semibold">₹{stockValue.toLocaleString('en-IN')}</TableCell>
                      <TableCell className={`text-right font-medium ${margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {margin.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">
                {selectedStore && selectedSupplier 
                  ? "No items found for the selected supplier at this outlet" 
                  : "Please select both an outlet and supplier to view items"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
