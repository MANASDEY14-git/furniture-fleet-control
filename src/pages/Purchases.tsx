
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingCart, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePurchases } from '@/hooks/usePurchases';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import { formatCurrency } from '@/utils/currencyUtils';
import { format } from 'date-fns';
import MultiItemPurchaseForm from '@/components/MultiItemPurchaseForm';
import ExportButton from '@/components/ExportButton';
import DateFilterSelector from '@/components/DateFilterSelector';
import StoreSelector from '@/components/StoreSelector';
import SupplierSelector from '@/components/SupplierSelector';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';
import { supabase } from '@/integrations/supabase/client';

export default function Purchases() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: purchases = [], isLoading, refetch: refetchPurchases } = usePurchases();
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();

  // Set up real-time subscriptions
  useEffect(() => {
    const channels: any[] = [];

    // Subscribe to purchases changes
    const purchasesChannel = supabase
      .channel('purchases-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchases'
        },
        () => {
          console.log('Purchases changed, refreshing...');
          refetchPurchases();
        }
      )
      .subscribe();
    channels.push(purchasesChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [refetchPurchases]);

  const filteredPurchases = useMemo(() => {
    let filtered = purchases.filter(purchase => {
      const matchesStore = selectedStore === 'all' || purchase.store_id === selectedStore;
      const matchesSupplier = selectedSupplier === 'all' || purchase.supplier_id === selectedSupplier;
      const matchesSearch = purchase.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (purchase.invoice_number && purchase.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStore && matchesSupplier && matchesSearch;
    });

    // Apply date filter
    if (dateFilter !== 'month' || customDateRange) {
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'custom':
          if (!customDateRange) return filtered;
          startDate = customDateRange.from;
          endDate = customDateRange.to;
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(purchase => {
        const purchaseDate = new Date(purchase.date);
        return purchaseDate >= startDate && purchaseDate <= endDate;
      });
    }

    return filtered;
  }, [purchases, selectedStore, selectedSupplier, searchTerm, dateFilter, customDateRange]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return 'N/A';
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };

  const getTotalCost = () => {
    return filteredPurchases.reduce((sum, purchase) => sum + purchase.total_cost, 0);
  };

  const getTotalItems = () => {
    return filteredPurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-cyan-300 glow-text">Purchase Management</h1>
        <div className="flex gap-2">
          <ExportButton 
            data={filteredPurchases.map(purchase => ({
              'Date': new Date(purchase.date).toLocaleDateString('en-GB'),
              'Invoice Number': purchase.invoice_number || 'N/A',
              'Store': getStoreName(purchase.store_id),
              'Supplier': getSupplierName(purchase.supplier_id),
              'Item': purchase.item_name,
              'Quantity': purchase.quantity,
              'Total Cost': purchase.total_cost
            }))} 
            filename={`purchases-${dateFilter}`} 
            type="purchases"
          />
          <MultiItemPurchaseForm
            trigger={
              <Button className="cyber-button text-white font-semibold">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Create Purchase Order
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
              <p className="text-2xl font-bold text-cyan-300">
                {filteredPurchases.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-cyan-300">
                {getTotalItems()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Cost</p>
              <p className="text-2xl font-bold text-cyan-300">
                {formatCurrency(getTotalCost())}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              <Input
                placeholder="Search items or invoice..."
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
              placeholder="All stores"
            />
            <SupplierSelector 
              value={selectedSupplier} 
              onValueChange={setSelectedSupplier}
              includeAll={true}
              placeholder="All suppliers"
            />
            <div className="lg:col-span-2">
              <DateFilterSelector
                dateFilter={dateFilter}
                onDateFilterChange={setDateFilter}
                customDateRange={customDateRange}
                onCustomDateRangeChange={setCustomDateRange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">Purchase Records ({filteredPurchases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-blue-300">Loading purchases...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Date</TableHead>
                    <TableHead className="text-blue-200">Invoice #</TableHead>
                    <TableHead className="text-blue-200">Store</TableHead>
                    <TableHead className="text-blue-200">Supplier</TableHead>
                    <TableHead className="text-blue-200">Item</TableHead>
                    <TableHead className="text-blue-200">Quantity</TableHead>
                    <TableHead className="text-blue-200">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id} className="border-blue-500/20 hover:bg-blue-800/20">
                      <TableCell className="text-blue-100">
                        {format(new Date(purchase.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-blue-100">
                        {purchase.invoice_number || 'N/A'}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {getStoreName(purchase.store_id)}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {getSupplierName(purchase.supplier_id)}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {purchase.item_name}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {purchase.quantity}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {formatCurrency(purchase.total_cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && filteredPurchases.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300 mb-4">No purchases found for the selected criteria</p>
              <MultiItemPurchaseForm
                trigger={
                  <Button className="cyber-button text-white font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Purchase Order
                  </Button>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
