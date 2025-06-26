
import { useState, useMemo } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import StoreSelector from '@/components/StoreSelector';
import SupplierSelector from '@/components/SupplierSelector';
import MultiItemSalesForm from '@/components/MultiItemSalesForm';
import StatusBadge from '@/components/StatusBadge';
import { useSales, useDeleteSale } from '@/hooks/useSales';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';

export default function Sales() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const deleteSale = useDeleteSale();

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesStore = selectedStore === 'all' || sale.store_id === selectedStore;
      const matchesSupplier = selectedSupplier === 'all' || sale.supplier_id === selectedSupplier;
      const matchesSearch = sale.item_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStore && matchesSupplier && matchesSearch;
    });
  }, [sales, selectedStore, selectedSupplier, searchTerm]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };

  const getTotalRevenue = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.total_price, 0);
  };

  const handleDeleteSale = (saleId: string) => {
    deleteSale.mutate(saleId);
  };

  if (salesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading sales...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Sales Management</h1>
          <p className="text-blue-300">Track sales by supplier and outlet with delivery status</p>
        </div>
        <MultiItemSalesForm
          trigger={
            <Button className="cyber-button text-white font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Record Sale
            </Button>
          }
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-cyan-300">
                {filteredSales.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Quantity</p>
              <p className="text-2xl font-bold text-cyan-300">
                {filteredSales.reduce((sum, sale) => sum + sale.quantity, 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-cyan-300">
                ₹{getTotalRevenue().toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              <Input
                placeholder="Search sales..."
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
              placeholder="All stores"
            />
            <SupplierSelector 
              value={selectedSupplier} 
              onValueChange={setSelectedSupplier}
              placeholder="All suppliers"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">Sales History ({filteredSales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Date</TableHead>
                  <TableHead className="text-blue-200">Store</TableHead>
                  <TableHead className="text-blue-200">Supplier</TableHead>
                  <TableHead className="text-blue-200">Item</TableHead>
                  <TableHead className="text-right text-blue-200">Quantity</TableHead>
                  <TableHead className="text-right text-blue-200">Rate</TableHead>
                  <TableHead className="text-right text-blue-200">Total</TableHead>
                  <TableHead className="text-blue-200">Status</TableHead>
                  <TableHead className="text-right text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="text-blue-100">{sale.date}</TableCell>
                    <TableCell className="text-blue-200">{getStoreName(sale.store_id)}</TableCell>
                    <TableCell className="text-blue-200">{getSupplierName(sale.supplier_id || '')}</TableCell>
                    <TableCell className="font-medium text-blue-100">{sale.item_name}</TableCell>
                    <TableCell className="text-right text-cyan-300">{sale.quantity}</TableCell>
                    <TableCell className="text-right text-blue-200">₹{(sale.total_price / sale.quantity).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right text-cyan-300 font-semibold">₹{sale.total_price.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <StatusBadge status={sale.delivery_status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="futuristic-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-cyan-300">Delete Sale</AlertDialogTitle>
                            <AlertDialogDescription className="text-blue-200">
                              Are you sure you want to delete this sale record? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteSale(sale.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredSales.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No sales found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
