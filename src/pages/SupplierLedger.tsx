
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, FileText, ArrowUpDown, Filter } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import SupplierSelector from '@/components/SupplierSelector';
import StoreSelector from '@/components/StoreSelector';
import DateFilterSelector from '@/components/DateFilterSelector';
import { useSupplierLedger, useSupplierBalances } from '@/hooks/useSupplierLedger';
import { useSupplierOpeningBalances } from '@/hooks/useSupplierOpeningBalances';
import { useStores } from '@/hooks/useStores';
import { Skeleton } from '@/components/ui/skeleton';
import ExportButton from '@/components/ExportButton';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

// Mobile Transaction Card Component
function MobileTransactionCard({
  entry,
  runningBalance,
  showBalance
}: {
  entry: any;
  runningBalance: number;
  showBalance: boolean;
}) {
  return (
    <Card className="bg-slate-800/50 border-blue-500/30">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <Badge className={`${
              entry.transaction_type === 'purchase' 
                ? 'bg-red-500/20 text-red-300' 
                : entry.transaction_type === 'opening_balance'
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'bg-green-500/20 text-green-300'
            }`}>
              {entry.transaction_type === 'purchase' ? 'Purchase' : entry.transaction_type === 'opening_balance' ? 'Opening Bal' : 'Payment'}
            </Badge>
          </div>
          <span className="text-blue-300 text-xs">
            {new Date(entry.transaction_date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-blue-200">Supplier:</span>
            <span className="text-blue-100">{entry.suppliers?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-200">Store:</span>
            <span className="text-blue-100">{entry.stores?.name}</span>
          </div>
          {entry.invoice_number && (
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">Ref/Invoice:</span>
              <span className="text-blue-300">{entry.invoice_number || entry.payment_reference}</span>
            </div>
          )}
          {entry.description && (
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">Description:</span>
              <span className="text-blue-100 truncate ml-2">{entry.description}</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-blue-500/20">
          <div className="text-center bg-slate-800/50 rounded p-2">
            <span className="text-xs text-blue-300 block">Debit (Dr)</span>
            <span className="text-red-400 font-semibold">
              {entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString('en-IN')}` : '-'}
            </span>
          </div>
          <div className="text-center bg-slate-800/50 rounded p-2">
            <span className="text-xs text-blue-300 block">Credit (Cr)</span>
            <span className="text-green-400 font-semibold">
              {entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString('en-IN')}` : '-'}
            </span>
          </div>
        </div>
        
        {showBalance && (
          <div className="mt-2 text-center bg-slate-700/50 rounded p-2">
            <span className="text-xs text-blue-300 block">Running Balance</span>
            <span className={`font-bold ${runningBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              ₹{Math.abs(runningBalance).toLocaleString('en-IN')}
              <span className="text-xs ml-1">{runningBalance >= 0 ? 'Dr' : 'Cr'}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SupplierLedger() {
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: stores = [] } = useStores();
  const { data: ledgerEntries = [], isLoading, refetch: refetchLedgerEntries } = useSupplierLedger(
    selectedSupplier === 'all' ? undefined : selectedSupplier,
    selectedStore === 'all' ? undefined : selectedStore
  );
  const { data: balances = [], refetch: refetchBalances } = useSupplierBalances(
    selectedStore === 'all' ? undefined : selectedStore
  );
  const { data: openingBalances = [] } = useSupplierOpeningBalances(
    selectedSupplier === 'all' ? undefined : selectedSupplier,
    selectedStore === 'all' ? undefined : selectedStore
  );

  // Set up real-time subscriptions
  useEffect(() => {
    const channels: any[] = [];

    const supplierLedgerChannel = supabase
      .channel('supplier-ledger-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'supplier_ledger' },
        () => {
          refetchLedgerEntries();
          refetchBalances();
        }
      )
      .subscribe();
    channels.push(supplierLedgerChannel);

    const purchasesChannel = supabase
      .channel('supplier-ledger-purchases-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchases' },
        () => {
          refetchLedgerEntries();
          refetchBalances();
        }
      )
      .subscribe();
    channels.push(purchasesChannel);

    const paymentsChannel = supabase
      .channel('supplier-ledger-payments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          refetchLedgerEntries();
          refetchBalances();
        }
      )
      .subscribe();
    channels.push(paymentsChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [refetchLedgerEntries, refetchBalances]);

  // Calculate opening balance for selected supplier/store
  const openingBalance = useMemo(() => {
    if (selectedSupplier === 'all') return 0;
    
    const ob = openingBalances.find(
      o => o.supplier_id === selectedSupplier && 
           (selectedStore === 'all' || o.store_id === selectedStore)
    );
    
    if (!ob) return 0;
    return ob.balance_type === 'debit' ? ob.opening_balance : -ob.opening_balance;
  }, [openingBalances, selectedSupplier, selectedStore]);

  // Filter and sort entries chronologically (oldest first for proper running balance)
  const filteredEntries = useMemo(() => {
    const filtered = ledgerEntries.filter(entry => {
      const matchesSearch = entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const entryDate = new Date(entry.transaction_date);
      let matchesDate = true;
      
      if (dateFilter === 'today') {
        const today = new Date();
        matchesDate = entryDate.toDateString() === today.toDateString();
      } else if (dateFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        matchesDate = entryDate >= weekAgo;
      } else if (dateFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        matchesDate = entryDate >= monthAgo;
      } else if (dateFilter === 'custom' && customDateRange) {
        matchesDate = entryDate >= customDateRange.from && entryDate <= customDateRange.to;
      }
      
      return matchesSearch && matchesDate;
    });

    return [...filtered].sort((a, b) => 
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );
  }, [ledgerEntries, searchTerm, dateFilter, customDateRange]);

  // Calculate running balance starting from opening balance
  const getRunningBalance = (index: number) => {
    let balance = openingBalance;
    for (let i = 0; i <= index; i++) {
      const entry = filteredEntries[i];
      balance += (entry.debit_amount || 0) - (entry.credit_amount || 0);
    }
    return balance;
  };

  // Calculate period totals
  const periodTotals = useMemo(() => {
    const totalDebit = filteredEntries.reduce((sum, e) => sum + (e.debit_amount || 0), 0);
    const totalCredit = filteredEntries.reduce((sum, e) => sum + (e.credit_amount || 0), 0);
    const closingBalance = openingBalance + totalDebit - totalCredit;
    
    return { totalDebit, totalCredit, closingBalance };
  }, [filteredEntries, openingBalance]);

  const activeFiltersCount = (selectedSupplier !== 'all' ? 1 : 0) + 
                             (selectedStore !== 'all' ? 1 : 0) + 
                             (dateFilter !== 'month' ? 1 : 0);

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold glow-text flex items-center gap-2">
            <FileText className="h-6 w-6 md:h-8 md:w-8" />
            Supplier Ledger
          </h1>
          <p className="text-sm md:text-base text-blue-300">Transaction history with running balance</p>
        </div>
        <div className="flex gap-2">
          {isMobile && (
            <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="neon-border bg-slate-800/50 text-blue-100 relative">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-cyan-500">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="futuristic-card">
                <DrawerHeader>
                  <DrawerTitle className="text-cyan-300">Filter Transactions</DrawerTitle>
                </DrawerHeader>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm text-blue-200 mb-2 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-blue-200 mb-2 block">Supplier</label>
                    <SupplierSelector 
                      value={selectedSupplier} 
                      onValueChange={setSelectedSupplier}
                      includeAll={true}
                      placeholder="All suppliers"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-blue-200 mb-2 block">Store</label>
                    <StoreSelector 
                      value={selectedStore} 
                      onValueChange={setSelectedStore}
                      stores={stores}
                      isLoading={false}
                      placeholder="All stores"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-blue-200 mb-2 block">Date Range</label>
                    <DateFilterSelector
                      dateFilter={dateFilter}
                      onDateFilterChange={setDateFilter}
                      customDateRange={customDateRange}
                      onCustomDateRangeChange={setCustomDateRange}
                    />
                  </div>
                </div>
                <DrawerFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedSupplier('all');
                      setSelectedStore('all');
                      setDateFilter('month');
                    }}
                    className="neon-border bg-slate-800/50 text-blue-100"
                  >
                    Clear Filters
                  </Button>
                  <DrawerClose asChild>
                    <Button className="cyber-button">Apply Filters</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          )}
          <ExportButton 
            data={filteredEntries} 
            filename="supplier-ledger-statement" 
            type="supplier-ledger"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="futuristic-card">
          <CardContent className="p-4 md:pt-6">
            <div className="text-center">
              <p className="text-xs md:text-sm text-blue-200 mb-1">Opening Balance</p>
              <p className={`text-lg md:text-2xl font-bold ${openingBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                ₹{Math.abs(openingBalance).toLocaleString('en-IN')}
                <span className="text-xs ml-1">{openingBalance >= 0 ? 'Dr' : 'Cr'}</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="p-4 md:pt-6">
            <div className="text-center">
              <p className="text-xs md:text-sm text-blue-200 mb-1">Purchases (Dr)</p>
              <p className="text-lg md:text-2xl font-bold text-red-400">
                ₹{periodTotals.totalDebit.toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="p-4 md:pt-6">
            <div className="text-center">
              <p className="text-xs md:text-sm text-blue-200 mb-1">Payments (Cr)</p>
              <p className="text-lg md:text-2xl font-bold text-green-400">
                ₹{periodTotals.totalCredit.toLocaleString('en-IN')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="p-4 md:pt-6">
            <div className="text-center">
              <p className="text-xs md:text-sm text-blue-200 mb-1">Closing Balance</p>
              <p className={`text-lg md:text-2xl font-bold ${periodTotals.closingBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                ₹{Math.abs(periodTotals.closingBalance).toLocaleString('en-IN')}
                <span className="text-xs ml-1">{periodTotals.closingBalance >= 0 ? 'Dr' : 'Cr'}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Filters */}
      {!isMobile && (
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="space-y-2">
                <label className="text-sm text-blue-200">Date Range</label>
                <div className="bg-slate-800/50 p-3 rounded-md border border-blue-500/30">
                  <DateFilterSelector
                    dateFilter={dateFilter}
                    onDateFilterChange={setDateFilter}
                    customDateRange={customDateRange}
                    onCustomDateRangeChange={setCustomDateRange}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Transaction Cards with Pull to Refresh */}
      {isMobile && (
        <PullToRefresh onRefresh={async () => { await refetchLedgerEntries(); await refetchBalances(); }}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-cyan-300">
                Transactions ({filteredEntries.length})
              </h2>
            </div>
          
          {/* Opening Balance Card */}
          {selectedSupplier !== 'all' && (
            <Card className="bg-slate-700/50 border-cyan-500/30">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-200 font-medium italic">Opening Balance</span>
                  <span className={`font-bold ${openingBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                    ₹{Math.abs(openingBalance).toLocaleString('en-IN')}
                    <span className="text-xs ml-1">{openingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          
          <ScrollArea className="h-[calc(100vh-500px)] min-h-[300px]">
            <div className="space-y-3 pr-4">
              {filteredEntries.map((entry, index) => (
                <MobileTransactionCard
                  key={entry.id}
                  entry={entry}
                  runningBalance={getRunningBalance(index)}
                  showBalance={selectedSupplier !== 'all'}
                />
              ))}
              
              {/* Closing Balance Card */}
              {filteredEntries.length > 0 && (
                <Card className="bg-slate-700/50 border-cyan-500/30">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="text-xs text-blue-300 block">Total Dr</span>
                        <span className="text-red-400 font-semibold text-sm">
                          ₹{periodTotals.totalDebit.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-blue-300 block">Total Cr</span>
                        <span className="text-green-400 font-semibold text-sm">
                          ₹{periodTotals.totalCredit.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-blue-300 block">Closing</span>
                        <span className={`font-bold text-sm ${periodTotals.closingBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                          ₹{Math.abs(periodTotals.closingBalance).toLocaleString('en-IN')}
                          <span className="text-xs ml-0.5">{periodTotals.closingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
          
          {filteredEntries.length === 0 && selectedSupplier === 'all' && (
            <Card className="futuristic-card">
              <CardContent className="p-8 text-center text-blue-300">
                Select a supplier to view their ledger
              </CardContent>
            </Card>
          )}
          
          {filteredEntries.length === 0 && selectedSupplier !== 'all' && (
            <Card className="futuristic-card">
              <CardContent className="p-8 text-center text-blue-300">
                No transactions found for this period
              </CardContent>
            </Card>
          )}
          </div>
        </PullToRefresh>
      )}

      {/* Desktop Ledger Statement Table */}
      {!isMobile && (
        <Card className="futuristic-card">
          <CardHeader>
            <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Ledger Statement ({filteredEntries.length} transactions)
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
                    <TableHead className="text-blue-200">Particulars</TableHead>
                    <TableHead className="text-blue-200">Ref/Invoice</TableHead>
                    <TableHead className="text-right text-blue-200">Debit (Dr)</TableHead>
                    <TableHead className="text-right text-blue-200">Credit (Cr)</TableHead>
                    <TableHead className="text-right text-blue-200">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Opening Balance Row */}
                  {selectedSupplier !== 'all' && (
                    <TableRow className="border-blue-500/20 bg-slate-800/50">
                      <TableCell className="text-blue-100 font-medium">-</TableCell>
                      <TableCell className="text-blue-200" colSpan={2}>-</TableCell>
                      <TableCell className="text-blue-200 font-medium italic">Opening Balance</TableCell>
                      <TableCell className="text-blue-300">-</TableCell>
                      <TableCell className="text-right text-red-400">
                        {openingBalance > 0 ? `₹${openingBalance.toLocaleString('en-IN')}` : '-'}
                      </TableCell>
                      <TableCell className="text-right text-green-400">
                        {openingBalance < 0 ? `₹${Math.abs(openingBalance).toLocaleString('en-IN')}` : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${openingBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        ₹{Math.abs(openingBalance).toLocaleString('en-IN')}
                        <span className="text-xs ml-1">{openingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {/* Transaction Rows */}
                  {filteredEntries.map((entry, index) => {
                    const runningBalance = getRunningBalance(index);
                    return (
                      <TableRow key={entry.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                        <TableCell className="text-blue-100">
                          {new Date(entry.transaction_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-blue-200">{entry.suppliers?.name}</TableCell>
                        <TableCell className="text-blue-200">{entry.stores?.name}</TableCell>
                        <TableCell className="text-blue-200">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            entry.transaction_type === 'purchase' 
                              ? 'bg-red-500/20 text-red-300' 
                              : entry.transaction_type === 'opening_balance'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}>
                            {entry.transaction_type === 'purchase' ? 'Purchase' : entry.transaction_type === 'opening_balance' ? 'Opening Bal' : 'Payment'}
                          </span>
                          <span className="ml-2 text-blue-300">{entry.description}</span>
                        </TableCell>
                        <TableCell className="text-blue-300 text-sm">
                          {entry.invoice_number || entry.payment_reference || '-'}
                        </TableCell>
                        <TableCell className="text-right text-red-400 font-medium">
                          {entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString('en-IN')}` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-400 font-medium">
                          {entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString('en-IN')}` : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${runningBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                          ₹{Math.abs(runningBalance).toLocaleString('en-IN')}
                          <span className="text-xs ml-1">{runningBalance >= 0 ? 'Dr' : 'Cr'}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Closing Balance / Totals Row */}
                  {filteredEntries.length > 0 && (
                    <TableRow className="border-blue-500/30 bg-slate-700/50 font-bold">
                      <TableCell colSpan={5} className="text-cyan-300 text-right">
                        Period Totals / Closing Balance
                      </TableCell>
                      <TableCell className="text-right text-red-400">
                        ₹{periodTotals.totalDebit.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right text-green-400">
                        ₹{periodTotals.totalCredit.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className={`text-right ${periodTotals.closingBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        ₹{Math.abs(periodTotals.closingBalance).toLocaleString('en-IN')}
                        <span className="text-xs ml-1">{periodTotals.closingBalance >= 0 ? 'Dr' : 'Cr'}</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {filteredEntries.length === 0 && selectedSupplier === 'all' && (
              <div className="text-center py-8">
                <p className="text-blue-300">Select a supplier to view their ledger statement</p>
              </div>
            )}
            {filteredEntries.length === 0 && selectedSupplier !== 'all' && (
              <div className="text-center py-8">
                <p className="text-blue-300">No transactions found for this supplier in the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
