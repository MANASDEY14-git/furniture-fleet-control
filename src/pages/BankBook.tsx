import { useState, useMemo } from 'react';
import { Building2, Filter, Download, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStores } from '@/hooks/useStores';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useBankTransactions, BankTransaction } from '@/hooks/useBankTransactions';
import { formatCurrency } from '@/utils/currencyUtils';
import { format } from 'date-fns';
import ExportButton from '@/components/ExportButton';
import { useQueryClient } from '@tanstack/react-query';

function MobileTransactionCard({ transaction }: { transaction: BankTransaction }) {
  const isReceipt = transaction.type === 'Receipt';
  
  return (
    <Card className="futuristic-card mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {isReceipt ? (
              <ArrowDownLeft className="w-5 h-5 text-green-400" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className="font-medium text-blue-100">{transaction.description || transaction.type}</p>
              <p className="text-xs text-blue-300">{format(new Date(transaction.date), 'dd MMM yyyy')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${isReceipt ? 'text-green-400' : 'text-red-400'}`}>
              {isReceipt ? '+' : '-'}{formatCurrency(transaction.net_amount || transaction.amount)}
            </p>
            <Badge variant={transaction.payment_status === 'completed' ? 'default' : 'secondary'} className="text-xs">
              {transaction.payment_status}
            </Badge>
          </div>
        </div>
        <div className="text-xs text-blue-300 space-y-1">
          <p><span className="text-blue-400">Bank:</span> {transaction.bank_name} - {transaction.account_name}</p>
          <p><span className="text-blue-400">Method:</span> {transaction.payment_method}</p>
          {transaction.supplier_name && <p><span className="text-blue-400">Supplier:</span> {transaction.supplier_name}</p>}
          {transaction.transaction_reference && <p><span className="text-blue-400">Ref:</span> {transaction.transaction_reference}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BankBook() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedBankAccount, setSelectedBankAccount] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const { data: stores = [] } = useStores();
  const { data: bankAccounts = [] } = useBankAccounts(selectedStore !== 'all' ? selectedStore : undefined);
  const { data: transactions = [], isLoading, refetch } = useBankTransactions(
    selectedStore !== 'all' ? selectedStore : undefined,
    selectedBankAccount !== 'all' ? selectedBankAccount : undefined,
    startDate || undefined,
    endDate || undefined
  );

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
    await refetch();
  };

  // Calculate summary
  const summary = useMemo(() => {
    let totalReceipts = 0;
    let totalPayments = 0;

    transactions.forEach(t => {
      const amount = t.net_amount || t.amount;
      if (t.type === 'Receipt') {
        totalReceipts += amount;
      } else {
        totalPayments += amount;
      }
    });

    return {
      totalReceipts,
      totalPayments,
      netBalance: totalReceipts - totalPayments,
    };
  }, [transactions]);

  // Export data
  const exportData = transactions.map(t => ({
    Date: format(new Date(t.date), 'dd/MM/yyyy'),
    Type: t.type,
    Description: t.description || '',
    'Bank Account': `${t.bank_name} - ${t.account_name}`,
    'Payment Method': t.payment_method || '',
    'Debit': t.type === 'Payment' ? (t.net_amount || t.amount) : '',
    'Credit': t.type === 'Receipt' ? (t.net_amount || t.amount) : '',
    'Bank Charges': t.bank_charges || 0,
    Reference: t.transaction_reference || '',
    Status: t.payment_status || '',
    Supplier: t.supplier_name || '',
  }));

  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-blue-200">Store</Label>
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-blue-500/30">
            <SelectItem value="all" className="text-blue-100">All Stores</SelectItem>
            {stores.map(store => (
              <SelectItem key={store.id} value={store.id} className="text-blue-100">
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-blue-200">Bank Account</Label>
        <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
            <SelectValue placeholder="All Accounts" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-blue-500/30">
            <SelectItem value="all" className="text-blue-100">All Accounts</SelectItem>
            {bankAccounts.map(account => (
              <SelectItem key={account.id} value={account.id} className="text-blue-100">
                {account.bank_name} - {account.account_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-blue-200">From Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="neon-border bg-slate-800/50 text-blue-100"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-blue-200">To Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="neon-border bg-slate-800/50 text-blue-100"
          />
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full neon-border bg-slate-800/50 text-blue-100"
        onClick={() => {
          setSelectedStore('all');
          setSelectedBankAccount('all');
          setStartDate('');
          setEndDate('');
        }}
      >
        Clear Filters
      </Button>
    </div>
  );

  const mobileContent = (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 pb-20">
        {/* Mobile Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-cyan-300">Bank Book</h1>
          </div>
          <div className="flex gap-2">
            <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" size="icon" className="neon-border">
                  <Filter className="w-4 h-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="futuristic-card">
                <DrawerHeader>
                  <DrawerTitle className="text-cyan-300">Filter Transactions</DrawerTitle>
                </DrawerHeader>
                <div className="p-4">
                  <FiltersContent />
                </div>
              </DrawerContent>
            </Drawer>
            <ExportButton data={exportData} filename="bank-book" type="payments" />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="futuristic-card">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-blue-300">Receipts</p>
              <p className="text-sm font-semibold text-green-400">{formatCurrency(summary.totalReceipts)}</p>
            </CardContent>
          </Card>
          <Card className="futuristic-card">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-blue-300">Payments</p>
              <p className="text-sm font-semibold text-red-400">{formatCurrency(summary.totalPayments)}</p>
            </CardContent>
          </Card>
          <Card className="futuristic-card">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-blue-300">Net</p>
              <p className={`text-sm font-semibold ${summary.netBalance >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                {formatCurrency(summary.netBalance)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        {isLoading ? (
          <div className="text-center py-8 text-blue-300">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-blue-300">No bank transactions found</div>
        ) : (
          transactions.map(transaction => (
            <MobileTransactionCard key={transaction.id} transaction={transaction} />
          ))
        )}
      </div>
    </PullToRefresh>
  );

  const desktopContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold glow-text">Bank Book</h1>
            <p className="text-blue-300">View all bank transactions across accounts</p>
          </div>
        </div>
        <ExportButton data={exportData} filename="bank-book" type="payments" />
      </div>

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-blue-200">Store</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  <SelectItem value="all" className="text-blue-100">All Stores</SelectItem>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id} className="text-blue-100">
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">Bank Account</Label>
              <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  <SelectItem value="all" className="text-blue-100">All Accounts</SelectItem>
                  {bankAccounts.map(account => (
                    <SelectItem key={account.id} value={account.id} className="text-blue-100">
                      {account.bank_name} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="neon-border bg-slate-800/50 text-blue-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-blue-200">To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="neon-border bg-slate-800/50 text-blue-100"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full neon-border bg-slate-800/50 text-blue-100"
                onClick={() => {
                  setSelectedStore('all');
                  setSelectedBankAccount('all');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="futuristic-card">
          <CardContent className="p-4">
            <p className="text-sm text-blue-300">Total Receipts</p>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.totalReceipts)}</p>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="p-4">
            <p className="text-sm text-blue-300">Total Payments</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.totalPayments)}</p>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="p-4">
            <p className="text-sm text-blue-300">Net Balance</p>
            <p className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              {formatCurrency(summary.netBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-blue-300">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-blue-300">No bank transactions found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="data-grid">
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Date</TableHead>
                    <TableHead className="text-blue-200">Description</TableHead>
                    <TableHead className="text-blue-200">Bank Account</TableHead>
                    <TableHead className="text-blue-200">Method</TableHead>
                    <TableHead className="text-blue-200 text-right">Debit</TableHead>
                    <TableHead className="text-blue-200 text-right">Credit</TableHead>
                    <TableHead className="text-blue-200">Reference</TableHead>
                    <TableHead className="text-blue-200">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(transaction => (
                    <TableRow key={transaction.id} className="border-blue-500/20 hover:bg-blue-800/20">
                      <TableCell className="text-blue-100">
                        {format(new Date(transaction.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-blue-100">
                        {transaction.description || transaction.type}
                        {transaction.supplier_name && (
                          <span className="text-blue-400 text-xs block">{transaction.supplier_name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-blue-200">
                        <div>
                          <span className="font-medium">{transaction.bank_name}</span>
                          <span className="text-xs block text-blue-400">{transaction.account_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-blue-200 capitalize">
                        {transaction.payment_method?.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="text-right text-red-400 font-medium">
                        {transaction.type === 'Payment' ? formatCurrency(transaction.net_amount || transaction.amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-green-400 font-medium">
                        {transaction.type === 'Receipt' ? formatCurrency(transaction.net_amount || transaction.amount) : '-'}
                      </TableCell>
                      <TableCell className="text-blue-200 text-xs">
                        {transaction.transaction_reference || transaction.cheque_number || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.payment_status === 'completed' ? 'default' : 'secondary'}>
                          {transaction.payment_status}
                        </Badge>
                      </TableCell>
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

  return isMobile ? mobileContent : desktopContent;
}
