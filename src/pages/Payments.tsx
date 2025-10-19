
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, CreditCard, Trash2 } from 'lucide-react';
import { usePayments, useDeletePayment } from '@/hooks/usePayments';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import StoreSelector from '@/components/StoreSelector';
import SupplierSelector from '@/components/SupplierSelector';
import ExportButton from '@/components/ExportButton';
import DateFilterSelector from '@/components/DateFilterSelector';
import PaymentEntryForm from '@/components/PaymentEntryForm';
import { formatCurrency } from '@/utils/currencyUtils';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

export default function Payments() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: payments = [], isLoading } = usePayments();
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const deletePayment = useDeletePayment();

  const filteredPayments = useMemo(() => {
    let filtered = payments.filter(payment => {
      const matchesStore = selectedStore === 'all' || payment.store_id === selectedStore;
      const matchesSupplier = selectedSupplier === 'all' || payment.supplier_id === selectedSupplier;
      const matchesSearch = payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
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

      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= startDate && paymentDate <= endDate;
      });
    }

    return filtered;
  }, [payments, selectedStore, selectedSupplier, searchTerm, dateFilter, customDateRange]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return 'N/A';
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };

  const getTotalPayments = () => {
    return filteredPayments.filter(payment => payment.type === 'Payment').reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getTotalReceipts = () => {
    return filteredPayments.filter(payment => payment.type === 'Receipt').reduce((sum, payment) => sum + payment.amount, 0);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deletePayment.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold glow-text">Payment Management</h1>
            <p className="text-blue-300">Track payments and receipts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={filteredPayments.map(payment => ({
              'Date': new Date(payment.date).toLocaleDateString('en-GB'),
              'Type': payment.type,
              'Payment Method': payment.payment_method || 'cash',
              'Store': getStoreName(payment.store_id),
              'Supplier': getSupplierName(payment.supplier_id),
              'Amount': payment.amount,
              'Bank Charges': payment.bank_charges || 0,
              'Net Amount': payment.net_amount || payment.amount,
              'Status': payment.payment_status || 'completed',
              'Description': payment.description || 'N/A'
            }))} 
            filename={`payments-${dateFilter}`} 
            type="payments"
          />
          <Button 
            className="cyber-button text-white font-semibold"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
          <PaymentEntryForm 
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Transactions</p>
              <p className="text-2xl font-bold text-cyan-300">
                {filteredPayments.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Receipts</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(getTotalReceipts())}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Payments</p>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(getTotalPayments())}
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
                placeholder="Search description..."
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

      {/* Transactions Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">
            Payment Records ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-blue-300">Loading transactions...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Date</TableHead>
                    <TableHead className="text-blue-200">Type</TableHead>
                    <TableHead className="text-blue-200">Store</TableHead>
                    <TableHead className="text-blue-200">Supplier</TableHead>
                    <TableHead className="text-blue-200">Description</TableHead>
                    <TableHead className="text-right text-blue-200">Amount</TableHead>
                    <TableHead className="text-right text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="border-blue-500/20 hover:bg-blue-800/20">
                      <TableCell className="text-blue-100">
                        {new Date(payment.date).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          payment.type === 'Receipt' 
                            ? 'bg-green-900/30 text-green-400' 
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {payment.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {getStoreName(payment.store_id)}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {getSupplierName(payment.supplier_id)}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {payment.description || 'N/A'}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        payment.type === 'Receipt' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(payment.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300 mb-4">No transactions found for the selected criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
