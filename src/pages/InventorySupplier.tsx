
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Package } from 'lucide-react';
import SupplierSelector from '@/components/SupplierSelector';
import ExportButton from '@/components/ExportButton';
import { useItems } from '@/hooks/useItems';
import { useSuppliers } from '@/hooks/useSuppliers';
import { formatCurrency } from '@/utils/currencyUtils';
import { Skeleton } from '@/components/ui/skeleton';

export default function InventorySupplier() {
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: items = [], isLoading: itemsLoading } = useItems();
  const { data: suppliers = [] } = useSuppliers();

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSupplier = selectedSupplier === 'all' || item.supplier_id === selectedSupplier;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSupplier && matchesSearch;
    });
  }, [items, selectedSupplier, searchTerm]);

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return 'Unknown Supplier';
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };

  const getTotalStockValue = () => {
    return filteredItems.reduce((sum, item) => 
      sum + (item.quantity_available * item.cost_price), 0
    );
  };

  const getTotalItems = () => {
    return filteredItems.reduce((sum, item) => sum + item.quantity_available, 0);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold glow-text">Inventory by Supplier</h1>
            <p className="text-blue-300">View inventory organized by supplier</p>
          </div>
        </div>
        <ExportButton 
          data={filteredItems.map(item => ({
            'Item Name': item.name,
            'Supplier': getSupplierName(item.supplier_id),
            'Quantity Available': item.quantity_available,
            'Cost Price': item.cost_price,
            'Selling Price': item.selling_price,
            'Stock Value': item.quantity_available * item.cost_price,
            'Last Restocked': item.last_restocked_date || 'N/A'
          }))} 
          filename={`inventory-by-supplier-${selectedSupplier === 'all' ? 'all' : getSupplierName(selectedSupplier)}`} 
          type="items"
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
                {getTotalItems()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Stock Value</p>
              <p className="text-2xl font-bold text-cyan-300">
                {formatCurrency(getTotalStockValue())}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>
            <SupplierSelector 
              value={selectedSupplier} 
              onValueChange={setSelectedSupplier}
              includeAll={true}
              placeholder="All suppliers"
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">
            Items by Supplier ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Item Name</TableHead>
                  <TableHead className="text-blue-200">Supplier</TableHead>
                  <TableHead className="text-right text-blue-200">Quantity</TableHead>
                  <TableHead className="text-right text-blue-200">Cost Price</TableHead>
                  <TableHead className="text-right text-blue-200">Selling Price</TableHead>
                  <TableHead className="text-right text-blue-200">Stock Value</TableHead>
                  <TableHead className="text-blue-200">Last Restocked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="font-medium text-blue-100">{item.name}</TableCell>
                    <TableCell className="text-blue-200">{getSupplierName(item.supplier_id)}</TableCell>
                    <TableCell className="text-right text-cyan-300">{item.quantity_available}</TableCell>
                    <TableCell className="text-right text-cyan-300">{formatCurrency(item.cost_price)}</TableCell>
                    <TableCell className="text-right text-cyan-300">{formatCurrency(item.selling_price)}</TableCell>
                    <TableCell className="text-right text-cyan-300 font-semibold">
                      {formatCurrency(item.quantity_available * item.cost_price)}
                    </TableCell>
                    <TableCell className="text-blue-200">
                      {item.last_restocked_date ? new Date(item.last_restocked_date).toLocaleDateString('en-GB') : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No items found for the selected criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
