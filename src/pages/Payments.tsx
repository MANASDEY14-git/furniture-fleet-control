
import { useState, useMemo } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import StoreSelector from '@/components/StoreSelector';
import SupplierSelector from '@/components/SupplierSelector';
import StatusBadge from '@/components/StatusBadge';
import { usePayments, useCreatePayment, useDeletePayment } from '@/hooks/usePayments';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';

export default function Payments() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    storeId: '',
    supplierId: '',
    amount: '',
    type: 'Receipt' as 'Payment' | 'Receipt',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesStore = selectedStore === 'all' || payment.store_id === selectedStore;
      const matchesType = selectedType === 'all' || payment.type === selectedType;
      const matchesSearch = payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      return matchesStore && matchesType && matchesSearch;
    });
  }, [payments, selectedStore, selectedType, searchTerm]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };

  const getTotals = () => {
    const receipts = filteredPayments
      .filter(p => p.type === 'Receipt')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const paymentsTotal = filteredPayments
      .filter(p => p.type === 'Payment')
      .reduce((sum, p) => sum + p.amount, 0);
    
    return { receipts, payments: paymentsTotal, net: receipts - paymentsTotal };
  };

  const totals = getTotals();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createPayment.mutate({
      store_id: formData.storeId,
      supplier_id: formData.supplierId || undefined,
      amount: parseFloat(formData.amount),
      type: formData.type,
      description: formData.description,
      date: formData.date,
    });
    
    setShowForm(false);
    setFormData({
      storeId: '',
      supplierId: '',
      amount: '',
      type: 'Receipt',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleDeletePayment = (paymentId: string) => {
    deletePayment.mutate(paymentId);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Payment Center</h1>
          <p className="text-blue-300">Track financial transactions with supplier ledger integration</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="cyber-button text-white font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'Add Transaction'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Receipts</p>
              <p className="text-2xl font-bold text-green-400">
                ₹{totals.receipts.toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Payments</p>
              <p className="text-2xl font-bold text-red-400">
                ₹{totals.payments.toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Net Flow</p>
              <p className={`text-2xl font-bold ${totals.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{Math.abs(totals.net).toLocaleString('en-IN')} {totals.net >= 0 ? '' : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Payment Form */}
      {showForm && (
        <Card className="futuristic-card">
          <CardHeader>
            <CardTitle className="text-cyan-300 glow-text">Record New Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store" className="text-blue-200">Store *</Label>
                <Select value={formData.storeId} onValueChange={(value) => setFormData({...formData, storeId: value})} required>
                  <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-blue-500/30">
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-blue-800/30">
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type" className="text-blue-200">Transaction Type *</Label>
                <Select value={formData.type} onValueChange={(value: 'Payment' | 'Receipt') => setFormData({...formData, type: value})}>
                  <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-blue-500/30">
                    <SelectItem value="Receipt" className="text-blue-100 focus:bg-blue-800/30">Receipt (Money In)</SelectItem>
                    <SelectItem value="Payment" className="text-blue-100 focus:bg-blue-800/30">Payment (Money Out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'Payment' && (
                <div className="space-y-2">
                  <Label htmlFor="supplier" className="text-blue-200">
                    Supplier <span className="text-xs">(for supplier payments)</span>
                  </Label>
                  <SupplierSelector 
                    value={formData.supplierId} 
                    onValueChange={(value) => setFormData({...formData, supplierId: value})}
                    placeholder="Select supplier (optional)"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-blue-200">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                  min="0"
                  className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-blue-200">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                  className="neon-border bg-slate-800/50 text-blue-100"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description" className="text-blue-200">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter transaction description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" className="w-full cyber-button text-white font-semibold" disabled={createPayment.isPending}>
                  {createPayment.isPending ? 'Recording Transaction...' : 'Record Transaction'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              <Input
                placeholder="Search descriptions..."
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
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/30">
                <SelectItem value="all" className="text-blue-100 focus:bg-blue-800/30">All Types</SelectItem>
                <SelectItem value="Receipt" className="text-blue-100 focus:bg-blue-800/30">Receipts</SelectItem>
                <SelectItem value="Payment" className="text-blue-100 focus:bg-blue-800/30">Payments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">Transaction History ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Date</TableHead>
                  <TableHead className="text-blue-200">Store</TableHead>
                  <TableHead className="text-blue-200">Type</TableHead>
                  <TableHead className="text-blue-200">Supplier</TableHead>
                  <TableHead className="text-right text-blue-200">Amount</TableHead>
                  <TableHead className="text-blue-200">Description</TableHead>
                  <TableHead className="text-right text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="text-blue-100">{payment.date}</TableCell>
                    <TableCell className="text-blue-200">{getStoreName(payment.store_id)}</TableCell>
                    <TableCell>
                      <StatusBadge status={payment.type} />
                    </TableCell>
                    <TableCell className="text-blue-200">
                      {payment.supplier_id ? getSupplierName(payment.supplier_id) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${payment.type === 'Receipt' ? 'text-green-400' : 'text-red-400'}`}>
                      {payment.type === 'Receipt' ? '+' : '-'}₹{payment.amount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-blue-200">{payment.description || 'No description'}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="futuristic-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-cyan-300">Delete Transaction</AlertDialogTitle>
                            <AlertDialogDescription className="text-blue-200">
                              Are you sure you want to delete this transaction? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeletePayment(payment.id)}
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
          {filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No transactions found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
