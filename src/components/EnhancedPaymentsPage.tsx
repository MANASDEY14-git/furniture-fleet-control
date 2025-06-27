
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, CreditCard, Trash2, Receipt, Banknote } from 'lucide-react';
import { usePayments, useCreatePayment, useDeletePayment } from '@/hooks/usePayments';
import { usePaymentSummary } from '@/hooks/usePaymentSummary';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import StoreSelector from '@/components/StoreSelector';
import SupplierSelector from '@/components/SupplierSelector';
import ExportButton from '@/components/ExportButton';
import DateFilterSelector from '@/components/DateFilterSelector';
import { formatCurrency } from '@/utils/currencyUtils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

const paymentSchema = z.object({
  store_id: z.string().min(1, 'Store is required'),
  supplier_id: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  type: z.enum(['Payment', 'Receipt']),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function EnhancedPaymentsPage() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: payments = [], isLoading } = usePayments();
  const { data: paymentSummary = [] } = usePaymentSummary(selectedStore);
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'Receipt'
    }
  });

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

  // Calculate summary from payment summary view
  const summaryData = useMemo(() => {
    if (selectedStore === 'all') {
      return paymentSummary.reduce((acc, item) => ({
        totalReceipts: acc.totalReceipts + item.total_receipts,
        totalPayments: acc.totalPayments + item.total_payments,
        netBalance: acc.netBalance + item.net_balance,
      }), { totalReceipts: 0, totalPayments: 0, netBalance: 0 });
    } else {
      const storeData = paymentSummary.find(item => item.store_id === selectedStore);
      return {
        totalReceipts: storeData?.total_receipts || 0,
        totalPayments: storeData?.total_payments || 0,
        netBalance: storeData?.net_balance || 0,
      };
    }
  }, [paymentSummary, selectedStore]);

  const onSubmit = (data: PaymentFormData) => {
    const paymentData = {
      store_id: data.store_id,
      supplier_id: data.supplier_id === '' ? undefined : data.supplier_id,
      amount: Number(data.amount),
      type: data.type,
      date: data.date,
      description: data.description || undefined,
      reference_type: 'general'
    };

    createPayment.mutate(paymentData, {
      onSuccess: () => {
        reset();
        setIsDialogOpen(false);
      }
    });
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
            <p className="text-blue-300">Track receipts and payments with real-time balances</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={filteredPayments.map(payment => ({
              'Date': new Date(payment.date).toLocaleDateString('en-GB'),
              'Type': payment.type,
              'Store': getStoreName(payment.store_id),
              'Supplier': getSupplierName(payment.supplier_id),
              'Amount': payment.amount,
              'Description': payment.description || 'N/A'
            }))} 
            filename={`payments-${dateFilter}`} 
            type="payments"
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="cyber-button text-white font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="futuristic-card">
              <DialogHeader>
                <DialogTitle className="text-cyan-300">Add New Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Transaction Type</Label>
                    <select
                      {...register('type')}
                      className="w-full p-2 rounded border bg-slate-800 text-blue-100 border-blue-500/30"
                    >
                      <option value="Receipt">Receipt (Money In)</option>
                      <option value="Payment">Payment (Money Out)</option>
                    </select>
                    {errors.type && <p className="text-red-400 text-sm">{errors.type.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      {...register('amount', { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      className="neon-border bg-slate-800/50 text-blue-100"
                      placeholder="Enter amount"
                    />
                    {errors.amount && <p className="text-red-400 text-sm">{errors.amount.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="store_id">Store</Label>
                    <select
                      {...register('store_id')}
                      className="w-full p-2 rounded border bg-slate-800 text-blue-100 border-blue-500/30"
                    >
                      <option value="">Select Store</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>{store.name}</option>
                      ))}
                    </select>
                    {errors.store_id && <p className="text-red-400 text-sm">{errors.store_id.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier_id">Supplier (Optional)</Label>
                    <select
                      {...register('supplier_id')}
                      className="w-full p-2 rounded border bg-slate-800 text-blue-100 border-blue-500/30"
                    >
                      <option value="">Select Supplier (Optional)</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      {...register('date')}
                      type="date"
                      className="neon-border bg-slate-800/50 text-blue-100"
                    />
                    {errors.date && <p className="text-red-400 text-sm">{errors.date.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      {...register('description')}
                      className="neon-border bg-slate-800/50 text-blue-100"
                      placeholder="Transaction description"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    className="border-blue-500/30 text-blue-200"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="cyber-button text-white"
                    disabled={createPayment.isPending}
                  >
                    {createPayment.isPending ? 'Adding...' : 'Add Transaction'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <Receipt className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Total Receipts</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(summaryData.totalReceipts)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-full">
                <Banknote className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Total Payments</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(summaryData.totalPayments)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${summaryData.netBalance >= 0 ? 'bg-cyan-500/20' : 'bg-orange-500/20'}`}>
                <CreditCard className={`w-6 h-6 ${summaryData.netBalance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`} />
              </div>
              <div>
                <p className="text-sm text-blue-200">Net Balance</p>
                <p className={`text-2xl font-bold ${summaryData.netBalance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                  {formatCurrency(summaryData.netBalance)}
                </p>
              </div>
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
