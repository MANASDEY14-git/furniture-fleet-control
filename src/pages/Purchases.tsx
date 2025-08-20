
import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EnhancedPurchaseForm from '@/components/EnhancedPurchaseForm';
import RefactoredMultiItemPurchaseForm from '@/components/purchase/RefactoredMultiItemPurchaseForm';
import ExportButton from '@/components/ExportButton';
import DateFilterSelector from '@/components/DateFilterSelector';
import { usePurchases } from '@/hooks/usePurchases';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import { formatCurrency } from '@/utils/currencyUtils';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

export default function Purchases() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);

  const { data: purchases = [], isLoading } = usePurchases();
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();

  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const matchesSearch = purchase.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           purchase.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = selectedStore === 'all' || purchase.store_id === selectedStore;
      const matchesSupplier = selectedSupplier === 'all' || purchase.supplier_id === selectedSupplier;
      
      // Date filtering logic
      const purchaseDate = new Date(purchase.date);
      let matchesDate = true;
      
      if (dateFilter === 'today') {
        const today = new Date();
        matchesDate = purchaseDate.toDateString() === today.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = purchaseDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = purchaseDate >= monthAgo;
      } else if (dateFilter === 'custom' && customDateRange) {
        matchesDate = purchaseDate >= customDateRange.from && purchaseDate <= customDateRange.to;
      }
      
      return matchesSearch && matchesStore && matchesSupplier && matchesDate;
    });
  }, [purchases, searchTerm, selectedStore, selectedSupplier, dateFilter, customDateRange]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };

  const getTotalAmount = () => {
    return filteredPurchases.reduce((sum, purchase) => sum + (purchase.total_cost || 0), 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading purchases...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Purchase Management</h1>
          <p className="text-blue-300">Track and manage all purchase orders</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={filteredPurchases.map(purchase => ({
              'Date': new Date(purchase.date).toLocaleDateString('en-GB'),
              'Invoice Number': purchase.invoice_number || 'N/A',
              'Item': purchase.item_name,
              'Supplier': getSupplierName(purchase.supplier_id || ''),
              'Store': getStoreName(purchase.store_id || ''),
              'Quantity': purchase.quantity,
              'Total Cost': purchase.total_cost
            }))} 
            filename="purchases" 
            type="purchases"
          />
          <EnhancedPurchaseForm
            trigger={
              <Button className="cyber-button text-white font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Single Item
              </Button>
            }
          />
          <RefactoredMultiItemPurchaseForm
            trigger={
              <Button className="cyber-button text-white font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Multi Item
              </Button>
            }
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Purchases</p>
              <p className="text-2xl font-bold text-cyan-300">{filteredPurchases.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-cyan-300">{formatCurrency(getTotalAmount())}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Active Suppliers</p>
              <p className="text-2xl font-bold text-cyan-300">
                {new Set(filteredPurchases.map(p => p.supplier_id)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-blue-200">Search</label>
              <Input
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="neon-border bg-slate-800/50 text-blue-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-blue-200">Store</label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  <SelectItem value="all" className="text-blue-100 focus:bg-blue-800/30">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-blue-800/30">
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-blue-200">Supplier</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  <SelectItem value="all" className="text-blue-100 focus:bg-blue-800/30">All Suppliers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="text-blue-100 focus:bg-blue-800/30">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-blue-200">Date Range</label>
              <div className="bg-slate-800/50 p-3 rounded-md border border-blue-500/30">
                <DateFilterSelector
                  dateFilter={dateFilter}
                  onDateFilterChange={setDateFilter}
                  customDateRange={customDateRange}
                  onCustomDateRangeChange={setCustomDateRange}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">
            Purchase Orders ({filteredPurchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Date</TableHead>
                  <TableHead className="text-blue-200">Invoice #</TableHead>
                  <TableHead className="text-blue-200">Item</TableHead>
                  <TableHead className="text-blue-200">Supplier</TableHead>
                  <TableHead className="text-blue-200">Store</TableHead>
                  <TableHead className="text-right text-blue-200">Quantity</TableHead>
                  <TableHead className="text-right text-blue-200">Total Cost</TableHead>
                  <TableHead className="text-blue-200">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="text-blue-100">
                      {new Date(purchase.date).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell className="font-medium text-cyan-300">
                      {purchase.invoice_number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-blue-200">{purchase.item_name}</TableCell>
                    <TableCell className="text-blue-200">
                      {getSupplierName(purchase.supplier_id || '')}
                    </TableCell>
                    <TableCell className="text-blue-200">
                      {getStoreName(purchase.store_id || '')}
                    </TableCell>
                    <TableCell className="text-right text-cyan-300 font-semibold">
                      {purchase.quantity}
                    </TableCell>
                    <TableCell className="text-right text-cyan-300 font-semibold">
                      {formatCurrency(purchase.total_cost || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-500/20 text-green-400">Completed</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredPurchases.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No purchases found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
