
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import SupplierSelector from '@/components/SupplierSelector';
import StoreSelector from '@/components/StoreSelector';
import { useSupplierLedger, useSupplierBalances } from '@/hooks/useSupplierLedger';
import { useStores } from '@/hooks/useStores';
import { Skeleton } from '@/components/ui/skeleton';

export default function SupplierLedger() {
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: stores = [] } = useStores();
  const { data: ledgerEntries = [], isLoading } = useSupplierLedger(
    selectedSupplier === 'all' ? undefined : selectedSupplier,
    selectedStore === 'all' ? undefined : selectedStore
  );
  const { data: balances = [] } = useSupplierBalances();

  const filteredEntries = ledgerEntries.filter(entry =>
    entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRunningBalance = (index: number) => {
    let balance = 0;
    for (let i = filteredEntries.length - 1; i >= index; i--) {
      const entry = filteredEntries[i];
      balance += (entry.debit_amount || 0) - (entry.credit_amount || 0);
    }
    return balance;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold glow-text">Supplier Ledger</h1>
        <p className="text-blue-300">Track supplier transactions and balances</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Suppliers</p>
              <p className="text-2xl font-bold text-cyan-300">
                {balances.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-400">
                ₹{balances.reduce((sum, b) => sum + Math.max(0, b.balance), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Advance Payments</p>
              <p className="text-2xl font-bold text-green-400">
                ₹{balances.reduce((sum, b) => sum + Math.max(0, -b.balance), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              <Input
                placeholder="Search transactions..."
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

      {/* Ledger Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">
            Ledger Entries ({filteredEntries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Date</TableHead>
                  <TableHead className="text-blue-200">Supplier</TableHead>
                  <TableHead className="text-blue-200">Store</TableHead>
                  <TableHead className="text-blue-200">Type</TableHead>
                  <TableHead className="text-blue-200">Description</TableHead>
                  <TableHead className="text-right text-blue-200">Debit</TableHead>
                  <TableHead className="text-right text-blue-200">Credit</TableHead>
                  <TableHead className="text-right text-blue-200">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry, index) => {
                  const runningBalance = getRunningBalance(index);
                  return (
                    <TableRow key={entry.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                      <TableCell className="text-blue-100">{entry.transaction_date}</TableCell>
                      <TableCell className="text-blue-200">{entry.suppliers?.name}</TableCell>
                      <TableCell className="text-blue-200">{entry.stores?.name}</TableCell>
                      <TableCell className="text-blue-200 capitalize">{entry.transaction_type}</TableCell>
                      <TableCell className="text-blue-200">{entry.description}</TableCell>
                      <TableCell className="text-right text-red-400">
                        {entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString('en-IN')}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-green-400">
                        {entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString('en-IN')}` : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${runningBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        ₹{Math.abs(runningBalance).toLocaleString('en-IN')}
                        {runningBalance >= 0 ? ' Dr' : ' Cr'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredEntries.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No ledger entries found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
