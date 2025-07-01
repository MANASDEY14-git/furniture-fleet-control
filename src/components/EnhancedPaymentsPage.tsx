
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

export default function EnhancedPaymentsPage() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: paymentSummary = [] } = usePaymentSummary(selectedStore);
  const { data: salePaymentStatus = [] } = useSalePaymentStatus();
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Enhanced Payments</h1>
          <p className="text-blue-300">Complete financial overview with real-time summaries</p>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Payment Transactions ({filteredPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
          {filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No payments found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outstanding Balances */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Outstanding Customer Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
