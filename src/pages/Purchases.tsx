import { useState, useMemo } from 'react';
import { Plus, Filter, Package, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import EnhancedPurchaseForm from '@/components/EnhancedPurchaseForm';
import RefactoredMultiItemPurchaseForm from '@/components/purchase/RefactoredMultiItemPurchaseForm';
import PurchaseCard from '@/components/purchases/PurchaseCard';
import PurchaseDetailsDialog from '@/components/purchases/PurchaseDetailsDialog';
import ExportButton from '@/components/ExportButton';
import DateFilterSelector from '@/components/DateFilterSelector';
import { usePurchases } from '@/hooks/usePurchases';
import { useStoreContext } from '@/contexts/StoreContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { formatCurrency } from '@/utils/currencyUtils';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';
export default function Purchases() {
  const isMobile = useIsMobile();
  const { activeStoreId, accessibleStores } = useStoreContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date; } | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [singleItemOpen, setSingleItemOpen] = useState(false);
  const [multiItemOpen, setMultiItemOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const {
    data: suppliers = []
  } = useSuppliers();
  const {
    data: purchases = [],
    isLoading,
    refetch
  } = usePurchases();
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const matchesSearch = purchase.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) || purchase.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = activeStoreId === 'all' || purchase.store_id === activeStoreId;
      const matchesSupplier = selectedSupplier === 'all' || purchase.supplier_id === selectedSupplier;
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
  }, [purchases, searchTerm, activeStoreId, selectedSupplier, dateFilter, customDateRange]);
  const getStoreName = (storeId: string) => {
    return accessibleStores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };
  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };
  const getTotalAmount = () => {
    return filteredPurchases.reduce((sum, purchase) => sum + (purchase.total_cost || 0), 0);
  };
  const handleViewDetails = (purchase: any) => {
    setSelectedPurchase(purchase);
    setDetailsOpen(true);
  };
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
        <div className="text-lg text-foreground">Loading purchases...</div>
      </div>;
  }
  if (isMobile) {
    return (
      <PullToRefresh onRefresh={async () => { await refetch(); }}>
        <div className="space-y-4 p-4 pb-24">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Purchases</h1>
          <p className="text-muted-foreground text-sm">Track your orders</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
              <p className="text-lg font-bold text-foreground">{filteredPurchases.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Value</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(getTotalAmount())}</p>
            </CardContent>
          </Card>
        </div>

        <Input placeholder="Search purchases..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />

        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" className="w-full">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-foreground">Filter Options</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Supplier</label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Date Range</label>
                <DateFilterSelector dateFilter={dateFilter} onDateFilterChange={setDateFilter} customDateRange={customDateRange} onCustomDateRangeChange={setCustomDateRange} />
              </div>
            </div>
          </DrawerContent>
        </Drawer>

        <div className="space-y-3">
          {filteredPurchases.length === 0 ? <div className="text-center py-8">
              <p className="text-muted-foreground">No purchases found</p>
            </div> : filteredPurchases.map(purchase => <PurchaseCard key={purchase.id} purchase={purchase} storeName={getStoreName(purchase.store_id || '')} supplierName={getSupplierName(purchase.supplier_id || '')} onViewDetails={() => handleViewDetails(purchase)} />)}
        </div>

        <PurchaseDetailsDialog purchase={selectedPurchase} storeName={selectedPurchase ? getStoreName(selectedPurchase.store_id || '') : ''} supplierName={selectedPurchase ? getSupplierName(selectedPurchase.supplier_id || '') : ''} open={detailsOpen} onOpenChange={setDetailsOpen} />

        <Sheet open={fabOpen} onOpenChange={setFabOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="fixed bottom-6 right-6 z-50 font-semibold rounded-full h-14 w-14 shadow-2xl">
              <Plus className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle className="text-foreground">New Purchase</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-4 py-6">
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => {
                  setFabOpen(false);
                  setTimeout(() => setSingleItemOpen(true), 150);
                }}
              >
                <Package className="h-6 w-6 text-primary" />
                <span className="text-sm">Single Item</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2"
                onClick={() => {
                  setFabOpen(false);
                  setTimeout(() => setMultiItemOpen(true), 150);
                }}
              >
                <Layers className="h-6 w-6 text-primary" />
                <span className="text-sm">Multi Item</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <EnhancedPurchaseForm open={singleItemOpen} onOpenChange={setSingleItemOpen} />
        <RefactoredMultiItemPurchaseForm open={multiItemOpen} onOpenChange={setMultiItemOpen} />
        </div>
      </PullToRefresh>
    );
  }
  return <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchase Management</h1>
          <p className="text-muted-foreground">Track and manage all purchase orders</p>
        </div>
        <div className="flex gap-2">
          <ExportButton data={filteredPurchases.map(purchase => ({
          'Date': new Date(purchase.date).toLocaleDateString('en-GB'),
          'Invoice Number': purchase.invoice_number || 'N/A',
          'Item': purchase.item_name,
          'Supplier': getSupplierName(purchase.supplier_id || ''),
          'Store': getStoreName(purchase.store_id || ''),
          'Quantity': purchase.quantity,
          'Total Cost': purchase.total_cost
        }))} filename="purchases" type="purchases" />
          <EnhancedPurchaseForm trigger={<Button className="font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Single Item
              </Button>} />
          <RefactoredMultiItemPurchaseForm trigger={<Button className="font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Multi Item
              </Button>} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Purchases</p>
              <p className="text-2xl font-bold text-foreground">{filteredPurchases.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(getTotalAmount())}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Active Suppliers</p>
              <p className="text-2xl font-bold text-foreground">
                {new Set(filteredPurchases.map(p => p.supplier_id)).size}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Search</label>
              <Input placeholder="Search purchases..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Supplier</label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Date Range</label>
              <DateFilterSelector dateFilter={dateFilter} onDateFilterChange={setDateFilter} customDateRange={customDateRange} onCustomDateRangeChange={setCustomDateRange} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">
            Purchase Orders ({filteredPurchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Invoice #</TableHead>
                  <TableHead className="text-muted-foreground">Item</TableHead>
                  <TableHead className="text-muted-foreground">Supplier</TableHead>
                  <TableHead className="text-muted-foreground">Store</TableHead>
                  <TableHead className="text-right text-muted-foreground">Quantity</TableHead>
                  <TableHead className="text-right text-muted-foreground">Total Cost</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map(purchase => <TableRow key={purchase.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-foreground">
                      {new Date(purchase.date).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {purchase.invoice_number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-foreground">{purchase.item_name}</TableCell>
                    <TableCell className="text-foreground">
                      {getSupplierName(purchase.supplier_id || '')}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {getStoreName(purchase.store_id || '')}
                    </TableCell>
                    <TableCell className="text-right text-foreground font-semibold">
                      {purchase.quantity}
                    </TableCell>
                    <TableCell className="text-right text-foreground font-semibold">
                      {formatCurrency(purchase.total_cost || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700">Completed</Badge>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>
          {filteredPurchases.length === 0 && <div className="text-center py-8">
              <p className="text-muted-foreground">No purchases found matching your criteria</p>
            </div>}
        </CardContent>
      </Card>
    </div>;
}
