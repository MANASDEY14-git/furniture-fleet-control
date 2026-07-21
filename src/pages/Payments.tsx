import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Plus, Search, CreditCard, Trash2, Receipt, DollarSign, TrendingUp, TrendingDown, Eye, Calendar, Building2 } from 'lucide-react';
import { usePayments, useDeletePayment } from '@/hooks/usePayments';
import { useComputedSalePaymentStatus } from '@/hooks/useComputedSalePaymentStatus';
import { useRecordPayment } from '@/hooks/useSalePaymentStatus';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useStoreContext } from '@/contexts/StoreContext';
import { useIsMobile } from '@/hooks/use-mobile';
import SupplierSelector from '@/components/SupplierSelector';
import DateFilterSelector from '@/components/DateFilterSelector';
import ExportButton from '@/components/ExportButton';
import PaymentEntryForm from '@/components/PaymentEntryForm';
import PaymentRecordDialog from '@/components/sales/PaymentRecordDialog';
import { PaginationControls } from '@/components/ui/pagination';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { formatCurrency } from '@/utils/currencyUtils';
import { supabase } from '@/integrations/supabase/client';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

export default function Payments() {
  const isMobile = useIsMobile();
  const { activeStoreId, accessibleStores } = useStoreContext();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Dialog / Drawer states
  const [isEntryFormOpen, setIsEntryFormOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [recordingPayment, setRecordingPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');

  // Data fetching hooks
  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments } = usePayments();
  const { data: salePaymentStatus = [], isLoading: ordersLoading, refetch: refetchSalePaymentStatus } = useComputedSalePaymentStatus(activeStoreId === 'all' ? undefined : activeStoreId);
  const { data: suppliers = [] } = useSuppliers();

  // Mutation hooks
  const deletePayment = useDeletePayment();
  const recordPayment = useRecordPayment();

  // Real-time updates subscription
  useEffect(() => {
    const channels: any[] = [];

    const paymentsChannel = supabase.channel('payments-unified-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        refetchPayments();
        refetchSalePaymentStatus();
      })
      .subscribe();
    channels.push(paymentsChannel);

    const salesOrdersChannel = supabase.channel('sales-orders-unified-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, () => {
        refetchSalePaymentStatus();
      })
      .subscribe();
    channels.push(salesOrdersChannel);

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [refetchPayments, refetchSalePaymentStatus]);

  // Helper function for date filtering
  const isDateInRange = (dateStr: string) => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate.getTime() === today.getTime();
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return date >= weekAgo && date <= today;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      return date >= monthAgo && date <= today;
    } else if (dateFilter === 'custom' && customDateRange) {
      const from = new Date(customDateRange.from);
      const to = new Date(customDateRange.to);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      return date >= from && date <= to;
    }
    return true;
  };

  // Filtered payment transactions
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesStore = activeStoreId === 'all' || payment.store_id === activeStoreId;
      const matchesSupplier = selectedSupplier === 'all' || payment.supplier_id === selectedSupplier;
      const matchesSearch = !searchTerm ||
        payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.type.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = isDateInRange(payment.date);

      return matchesStore && matchesSupplier && matchesSearch && matchesDate;
    });
  }, [payments, activeStoreId, selectedSupplier, searchTerm, dateFilter, customDateRange]);

  // Filtered outstanding balances — EXCLUDES CANCELLED ORDERS!
  const filteredOutstandingBalances = useMemo(() => {
    return salePaymentStatus.filter(sale => {
      // Must have positive balance due
      if (!sale.balance_due || sale.balance_due <= 0) return false;

      // Filter out cancelled orders!
      const statusLower = (sale.delivery_status || '').toLowerCase();
      if (statusLower === 'cancelled') return false;

      // Store filter
      const matchesStore = activeStoreId === 'all' || sale.store_id === activeStoreId;

      // Supplier filter
      const matchesSupplier = selectedSupplier === 'all' || sale.supplier_id === selectedSupplier;

      // Search filter
      const matchesSearch = !searchTerm ||
        sale.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStore && matchesSupplier && matchesSearch;
    });
  }, [salePaymentStatus, activeStoreId, selectedSupplier, searchTerm]);

  // Pagination for payments table
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayments, currentPage]);

  // Dynamic summary statistics computed directly from filtered payments
  const summary = useMemo(() => {
    const receipts = filteredPayments
      .filter(p => p.type === 'Receipt')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const vendorPayments = filteredPayments
      .filter(p => p.type === 'Payment')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalReceipts: receipts,
      totalPayments: vendorPayments,
      netBalance: receipts - vendorPayments,
    };
  }, [filteredPayments]);

  // Helper functions for store / supplier names
  const getStoreName = (storeId: string) => {
    return accessibleStores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return 'N/A';
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Walk-in / Direct';
  };

  // Handlers
  const handleDeletePayment = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction record?')) {
      await deletePayment.mutateAsync(id);
    }
  };

  const handleRecordOrderPayment = async () => {
    if (!recordingPayment || !paymentAmount) return;

    const description = paymentDescription.trim() || `Payment for order ${recordingPayment.order_number}`;

    await recordPayment.mutateAsync({
      sale_id: recordingPayment.sale_id,
      amount: parseFloat(paymentAmount),
      date: new Date().toISOString().split('T')[0],
      description,
      store_id: recordingPayment.store_id,
      order_description: recordingPayment.order_number,
    });

    setRecordingPayment(null);
    setPaymentAmount('');
    setPaymentDescription('');
  };

  const handleRefresh = async () => {
    await Promise.all([refetchPayments(), refetchSalePaymentStatus()]);
  };

  if (paymentsLoading || ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading payments...</div>
      </div>
    );
  }

  const pageContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold glow-text">Payments Management</h1>
          <p className="text-sm sm:text-base text-blue-300">
            Unified view of vendor payments, receipts, and customer outstanding balances
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportButton
            data={filteredPayments.map(p => ({
              Date: new Date(p.date).toLocaleDateString('en-GB'),
              Type: p.type,
              Store: getStoreName(p.store_id),
              Supplier: getSupplierName(p.supplier_id),
              Amount: p.amount,
              Description: p.description || 'N/A'
            }))}
            filename={`payments-${dateFilter}`}
            type="payments"
          />
          <Button
            className="cyber-button text-white font-semibold"
            onClick={() => setIsEntryFormOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Total Receipts</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(summary.totalReceipts)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-full">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Total Payments</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(summary.totalPayments)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Net Balance</p>
                <p className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
                  {formatCurrency(summary.netBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="futuristic-card">
        <CardContent className="p-4 sm:pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              <Input
                placeholder="Search description, order #, customer..."
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
            <DateFilterSelector
              dateFilter={dateFilter}
              onDateFilterChange={(value) => {
                setDateFilter(value);
                setCurrentPage(1);
              }}
              customDateRange={customDateRange}
              onCustomDateRangeChange={setCustomDateRange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Transactions List */}
      <Card className="futuristic-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2 text-lg sm:text-xl">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            Payment Transactions ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isMobile ? (
            // Mobile Card View
            <div className="space-y-4">
              {paginatedPayments.map((payment) => (
                <Card key={payment.id} className="bg-slate-800/50 border-blue-500/30">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={payment.type === 'Receipt' ? 'default' : 'destructive'}>
                          {payment.type === 'Receipt' ? <Receipt className="w-3 h-3 mr-1" /> : <CreditCard className="w-3 h-3 mr-1" />}
                          {payment.type}
                        </Badge>
                        <Badge variant="secondary" className="bg-lime-500 text-primary-foreground">Completed</Badge>
                      </div>
                      <div className={`text-lg font-semibold ${payment.type === 'Receipt' ? 'text-green-400' : 'text-red-400'}`}>
                        {payment.type === 'Receipt' ? '+' : '-'}{formatCurrency(payment.amount)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-200 text-sm">Date:</span>
                        <span className="text-blue-100 text-sm">{new Date(payment.date).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200 text-sm">Store:</span>
                        <span className="text-blue-100 text-sm">{getStoreName(payment.store_id)}</span>
                      </div>
                      {payment.description && (
                        <div className="flex justify-between">
                          <span className="text-blue-200 text-sm">Description:</span>
                          <span className="text-blue-100 text-sm truncate ml-2 max-w-[180px]">{payment.description}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex justify-between items-center pt-3 border-t border-blue-500/20">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => handleDeletePayment(payment.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                        onClick={() => setSelectedPayment(payment)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop Table View
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Date</TableHead>
                    <TableHead className="text-blue-200">Type</TableHead>
                    <TableHead className="text-blue-200">Store</TableHead>
                    <TableHead className="text-blue-200">Description</TableHead>
                    <TableHead className="text-right text-blue-200">Amount</TableHead>
                    <TableHead className="text-right text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.map((payment) => (
                    <TableRow key={payment.id} className="border-blue-500/20">
                      <TableCell className="text-blue-200">{new Date(payment.date).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell>
                        <Badge variant={payment.type === 'Receipt' ? 'default' : 'destructive'}>
                          {payment.type === 'Receipt' ? <Receipt className="w-3 h-3 mr-1" /> : <CreditCard className="w-3 h-3 mr-1" />}
                          {payment.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-blue-200">{getStoreName(payment.store_id)}</TableCell>
                      <TableCell className="text-blue-200">{payment.description || '-'}</TableCell>
                      <TableCell className={`text-right font-semibold ${payment.type === 'Receipt' ? 'text-green-400' : 'text-red-400'}`}>
                        {payment.type === 'Receipt' ? '+' : '-'}{formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={() => handleDeletePayment(payment.id)}
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

          {filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No payment transactions found matching your criteria</p>
            </div>
          )}

          {filteredPayments.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              startItem={(currentPage - 1) * itemsPerPage + 1}
              endItem={Math.min(currentPage * itemsPerPage, filteredPayments.length)}
              totalItems={filteredPayments.length}
            />
          )}
        </CardContent>
      </Card>

      {/* Outstanding Customer Balances (EXCLUDES CANCELLED ORDERS) */}
      <Card className="futuristic-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            Outstanding Customer Balances ({filteredOutstandingBalances.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isMobile ? (
            // Mobile Card Layout
            <div className="space-y-4">
              {filteredOutstandingBalances.map((sale) => (
                <Card key={sale.sale_id} className="bg-slate-800/50 border-blue-500/30">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-cyan-300 text-sm">#{sale.order_number}</p>
                        <p className="text-blue-200 text-sm">{sale.customer_name || 'Walk-in Customer'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-400 font-semibold">{formatCurrency(sale.balance_due)}</p>
                        <p className="text-xs text-blue-300">Balance Due</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-blue-200 text-sm">Store:</span>
                        <span className="text-blue-100 text-sm">{getStoreName(sale.store_id)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200 text-sm">Total:</span>
                        <span className="text-cyan-300 text-sm">{formatCurrency(sale.total_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-200 text-sm">Paid:</span>
                        <span className="text-green-400 text-sm">{formatCurrency(sale.total_paid)}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-blue-500/20 flex justify-end">
                      <Button
                        size="sm"
                        className="cyber-button text-xs"
                        onClick={() => {
                          setRecordingPayment(sale);
                          setPaymentAmount(sale.balance_due.toString());
                        }}
                      >
                        Record Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop Table Layout
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Order #</TableHead>
                    <TableHead className="text-blue-200">Customer</TableHead>
                    <TableHead className="text-blue-200">Store</TableHead>
                    <TableHead className="text-right text-blue-200">Total</TableHead>
                    <TableHead className="text-right text-blue-200">Paid</TableHead>
                    <TableHead className="text-right text-blue-200">Balance Due</TableHead>
                    <TableHead className="text-right text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutstandingBalances.map((sale) => (
                    <TableRow key={sale.sale_id} className="border-blue-500/20">
                      <TableCell className="font-medium text-cyan-300">{sale.order_number}</TableCell>
                      <TableCell className="text-blue-200">{sale.customer_name || 'Walk-in Customer'}</TableCell>
                      <TableCell className="text-blue-200">{getStoreName(sale.store_id)}</TableCell>
                      <TableCell className="text-right text-cyan-300">{formatCurrency(sale.total_price)}</TableCell>
                      <TableCell className="text-right text-green-400">{formatCurrency(sale.total_paid)}</TableCell>
                      <TableCell className="text-right text-orange-400 font-semibold">{formatCurrency(sale.balance_due)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="cyber-button text-xs"
                          onClick={() => {
                            setRecordingPayment(sale);
                            setPaymentAmount(sale.balance_due.toString());
                          }}
                        >
                          Record Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredOutstandingBalances.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No active outstanding customer balances</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Entry Form Dialog */}
      <PaymentEntryForm
        open={isEntryFormOpen}
        onOpenChange={setIsEntryFormOpen}
      />

      {/* Record Order Payment Dialog */}
      <PaymentRecordDialog
        recordingPayment={recordingPayment}
        setRecordingPayment={setRecordingPayment}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentDescription={paymentDescription}
        setPaymentDescription={setPaymentDescription}
        handleRecordPayment={handleRecordOrderPayment}
        isRecordingPayment={recordPayment.isPending}
      />

      {/* Payment Details Dialog / Drawer */}
      {selectedPayment && (
        isMobile ? (
          <Drawer open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
            <DrawerContent className="futuristic-card">
              <DrawerHeader>
                <DrawerTitle className="text-cyan-300">Transaction Details</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-blue-200 font-medium">Type:</span>
                  <span className="text-blue-100">{selectedPayment.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-200 font-medium">Amount:</span>
                  <span className="text-blue-100">{formatCurrency(selectedPayment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-200 font-medium">Date:</span>
                  <span className="text-blue-100">{new Date(selectedPayment.date).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-200 font-medium">Store:</span>
                  <span className="text-blue-100">{getStoreName(selectedPayment.store_id)}</span>
                </div>
                {selectedPayment.supplier_id && (
                  <div className="flex justify-between">
                    <span className="text-blue-200 font-medium">Supplier:</span>
                    <span className="text-blue-100">{getSupplierName(selectedPayment.supplier_id)}</span>
                  </div>
                )}
                {selectedPayment.description && (
                  <div>
                    <p className="text-blue-200 font-medium mb-1">Description:</p>
                    <p className="text-blue-100 text-sm bg-slate-800/50 p-3 rounded-md">{selectedPayment.description}</p>
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
            <DialogContent className="futuristic-card">
              <DialogHeader>
                <DialogTitle className="text-cyan-300">Transaction Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-blue-200"><strong>Type:</strong> {selectedPayment.type}</p>
                    <p className="text-blue-200"><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
                    <p className="text-blue-200"><strong>Date:</strong> {new Date(selectedPayment.date).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div>
                    <p className="text-blue-200"><strong>Store:</strong> {getStoreName(selectedPayment.store_id)}</p>
                    {selectedPayment.supplier_id && (
                      <p className="text-blue-200"><strong>Supplier:</strong> {getSupplierName(selectedPayment.supplier_id)}</p>
                    )}
                  </div>
                </div>
                {selectedPayment.description && (
                  <div>
                    <p className="text-blue-200"><strong>Description:</strong></p>
                    <p className="text-blue-100 ml-2 bg-slate-800/50 p-3 rounded-md">{selectedPayment.description}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      )}
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 pb-20">{pageContent}</div>
      </PullToRefresh>
    );
  }

  return pageContent;
}
