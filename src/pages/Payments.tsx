
import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StoreSelector from '@/components/StoreSelector';
import StatusBadge from '@/components/StatusBadge';
import { payments, stores } from '@/data/mockData';

export default function Payments() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    storeId: '',
    amount: '',
    type: 'Receipt' as 'Payment' | 'Receipt',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesStore = selectedStore === 'all' || payment.storeId === selectedStore;
      const matchesType = selectedType === 'all' || payment.type === selectedType;
      const matchesSearch = payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      return matchesStore && matchesType && matchesSearch;
    });
  }, [selectedStore, selectedType, searchTerm]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
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
    console.log('New payment:', formData);
    // Here you would typically save to your backend
    setShowForm(false);
    setFormData({
      storeId: '',
      amount: '',
      type: 'Receipt',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Track financial transactions</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'Add Transaction'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Receipts</p>
              <p className="text-2xl font-bold text-green-600">
                ${totals.receipts.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Payments</p>
              <p className="text-2xl font-bold text-red-600">
                ${totals.payments.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Net Flow</p>
              <p className={`text-2xl font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totals.net.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Payment Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Record New Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store">Store</Label>
                <Select value={formData.storeId} onValueChange={(value) => setFormData({...formData, storeId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Transaction Type</Label>
                <Select value={formData.type} onValueChange={(value: 'Payment' | 'Receipt') => setFormData({...formData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receipt">Receipt (Money In)</SelectItem>
                    <SelectItem value="Payment">Payment (Money Out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter transaction description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Record Transaction
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <StoreSelector 
              value={selectedStore} 
              onValueChange={setSelectedStore}
            />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Receipt">Receipts</SelectItem>
                <SelectItem value="Payment">Payments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{getStoreName(payment.storeId)}</TableCell>
                    <TableCell>
                      <StatusBadge status={payment.type} />
                    </TableCell>
                    <TableCell className={`text-right font-medium ${payment.type === 'Receipt' ? 'text-green-600' : 'text-red-600'}`}>
                      {payment.type === 'Receipt' ? '+' : '-'}${payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>{payment.description || 'No description'}</TableCell>
                    <TableCell>{payment.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No transactions found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
