
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Receipt,
  Search,
  Eye,
  Calendar
} from 'lucide-react';
import { usePayments } from '@/hooks/usePayments';
import { usePaymentSummary } from '@/hooks/usePaymentSummary';
import { useSalePaymentStatus } from '@/hooks/useSalePaymentStatus';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import StoreSelector from '@/components/StoreSelector';
import { formatCurrency } from '@/utils/currencyUtils';
import ExportButton from '@/components/ExportButton';
import { supabase } from '@/integrations/supabase/client';

export default function EnhancedPaymentsPage() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const isMobile = useIsMobile();

  const { data: payments = [], isLoading: paymentsLoading, refetch: refetchPayments } = usePayments();
  const { data: paymentSummary = [], refetch: refetchPaymentSummary } = usePaymentSummary(selectedStore);
  const { data: salePaymentStatus = [], refetch: refetchSalePaymentStatus } = useSalePaymentStatus();
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();

  // Set up real-time subscriptions
  useEffect(() => {
    const channels: any[] = [];

    // Subscribe to payments changes
    const paymentsChannel = supabase
      .channel('enhanced-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          console.log('Payments changed, refreshing enhanced payments...');
          refetchPayments();
          refetchPaymentSummary();
          refetchSalePaymentStatus();
        }
      )
      .subscribe();
    channels.push(paymentsChannel);

    // Subscribe to sales_orders changes for outstanding balances
    const salesOrdersChannel = supabase
      .channel('enhanced-payments-sales-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_orders'
        },
        () => {
          console.log('Sales orders changed, refreshing outstanding balances...');
          refetchSalePaymentStatus();
        }
      )
      .subscribe();
    channels.push(salesOrdersChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [refetchPayments, refetchPaymentSummary, refetchSalePaymentStatus]);

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesStore = selectedStore === 'all' || payment.store_id === selectedStore;
      const matchesSearch = payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.type.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStore && matchesSearch;
    });
  }, [payments, selectedStore, searchTerm]);

  const summary = useMemo(() => {
    if (paymentSummary.length === 0) return { totalReceipts: 0, totalPayments: 0, netBalance: 0 };
    
    return paymentSummary.reduce((acc, curr) => ({
      totalReceipts: acc.totalReceipts + (curr.total_receipts || 0),
      totalPayments: acc.totalPayments + (curr.total_payments || 0),
      netBalance: acc.netBalance + (curr.net_balance || 0)
    }), { totalReceipts: 0, totalPayments: 0, netBalance: 0 });
  }, [paymentSummary]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };

  if (paymentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold glow-text">Enhanced Payments</h1>
          <p className="text-sm sm:text-base text-blue-300">Complete financial overview with real-time summaries</p>
        </div>
        <div className="flex sm:block">
          <ExportButton 
            data={filteredPayments} 
            filename="enhanced-payments" 
            type="payments"
          />
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="p-4 sm:pt-6">
          <div className="space-y-4">
            {isMobile && (
              <Button
                variant="ghost"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="w-full text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
              >
                <Search className="w-4 h-4 mr-2" />
                Filters {filtersExpanded ? '▼' : '▶'}
              </Button>
            )}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isMobile && !filtersExpanded ? 'hidden' : ''}`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                <Input
                  placeholder="Search payments..."
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table/Cards */}
      <Card className="futuristic-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2 text-lg sm:text-xl">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            Payment Transactions ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isMobile ? (
            // Mobile Card Layout
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <Card key={payment.id} className="bg-slate-800/50 border-blue-500/30">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={payment.type === 'Receipt' ? 'default' : 'destructive'}>
                          {payment.type === 'Receipt' ? (
                            <Receipt className="w-3 h-3 mr-1" />
                          ) : (
                            <CreditCard className="w-3 h-3 mr-1" />
                          )}
                          {payment.type}
                        </Badge>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                      <div className={`text-lg font-semibold ${
                        payment.type === 'Receipt' ? 'text-green-400' : 'text-red-400'
                      }`}>
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
                          <span className="text-blue-100 text-sm truncate ml-2">{payment.description}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex justify-end">
                      {isMobile ? (
                        <Drawer>
                          <DrawerTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                              onClick={() => setSelectedPayment(payment)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Details
                            </Button>
                          </DrawerTrigger>
                          <DrawerContent className="futuristic-card">
                            <DrawerHeader>
                              <DrawerTitle className="text-cyan-300">Payment Details</DrawerTitle>
                            </DrawerHeader>
                            <div className="p-4">
                              {selectedPayment && (
                                <div className="space-y-4">
                                  <div className="space-y-3">
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
                                  </div>
                                  {selectedPayment.description && (
                                    <div>
                                      <p className="text-blue-200 font-medium mb-2">Description:</p>
                                      <p className="text-blue-100 text-sm bg-slate-800/50 p-3 rounded-md">{selectedPayment.description}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </DrawerContent>
                        </Drawer>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                              onClick={() => setSelectedPayment(payment)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="futuristic-card">
                            <DialogHeader>
                              <DialogTitle className="text-cyan-300">Payment Details</DialogTitle>
                            </DialogHeader>
                            {selectedPayment && (
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
                                    <p className="text-blue-100 ml-4">{selectedPayment.description}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      )}
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
                    <TableHead className="text-blue-200">Date</TableHead>
                    <TableHead className="text-blue-200">Type</TableHead>
                    <TableHead className="text-blue-200">Store</TableHead>
                    <TableHead className="text-blue-200">Description</TableHead>
                    <TableHead className="text-right text-blue-200">Amount</TableHead>
                    <TableHead className="text-blue-200">Status</TableHead>
                    <TableHead className="text-right text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                      <TableCell className="text-blue-100">
                        {new Date(payment.date).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.type === 'Receipt' ? 'default' : 'destructive'}>
                          {payment.type === 'Receipt' ? (
                            <Receipt className="w-3 h-3 mr-1" />
                          ) : (
                            <CreditCard className="w-3 h-3 mr-1" />
                          )}
                          {payment.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {getStoreName(payment.store_id)}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {payment.description || 'No description'}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        payment.type === 'Receipt' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {payment.type === 'Receipt' ? '+' : '-'}{formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Completed</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                              onClick={() => setSelectedPayment(payment)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="futuristic-card">
                            <DialogHeader>
                              <DialogTitle className="text-cyan-300">Payment Details</DialogTitle>
                            </DialogHeader>
                            {selectedPayment && (
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
                                    <p className="text-blue-100 ml-4">{selectedPayment.description}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No payments found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outstanding Balances */}
      <Card className="futuristic-card">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2 text-lg sm:text-xl">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            Outstanding Customer Balances
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isMobile ? (
            // Mobile Card Layout
            <div className="space-y-4">
              {salePaymentStatus
                .filter(sale => sale.balance_due > 0)
                .slice(0, 10)
                .map((sale) => (
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
                    <TableHead className="text-right text-blue-200">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salePaymentStatus
                    .filter(sale => sale.balance_due > 0)
                    .slice(0, 10)
                    .map((sale) => (
                      <TableRow key={sale.sale_id} className="border-blue-500/20">
                        <TableCell className="font-medium text-cyan-300">{sale.order_number}</TableCell>
                        <TableCell className="text-blue-200">{sale.customer_name || 'Walk-in Customer'}</TableCell>
                        <TableCell className="text-blue-200">{getStoreName(sale.store_id)}</TableCell>
                        <TableCell className="text-right text-cyan-300">{formatCurrency(sale.total_price)}</TableCell>
                        <TableCell className="text-right text-green-400">{formatCurrency(sale.total_paid)}</TableCell>
                        <TableCell className="text-right text-orange-400 font-semibold">{formatCurrency(sale.balance_due)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
