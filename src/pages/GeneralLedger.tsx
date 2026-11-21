import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, CheckCircle2, AlertTriangle, Plus, Trash2, Search, ArrowRightLeft, Layers, RefreshCw } from 'lucide-react';
import { 
  useChartOfAccounts, 
  useTrialBalance, 
  useJournalEntries, 
  usePostJournalEntry 
} from '@/hooks/useGeneralLedger';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

export default function GeneralLedger() {
  const [activeTab, setActiveTab] = useState<'trial-balance' | 'day-book' | 'chart-of-accounts'>('trial-balance');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [voucherFilter, setVoucherFilter] = useState<string>('all');
  const [isNewVoucherOpen, setIsNewVoucherOpen] = useState(false);

  // Queries
  const { data: coa = [], isLoading: coaLoading, refetch: refetchCOA } = useChartOfAccounts();
  const { data: trialBalance = [], isLoading: tbLoading, refetch: refetchTB } = useTrialBalance();
  const { data: journalEntries = [], isLoading: jeLoading, refetch: refetchJE } = useJournalEntries();

  // Mutation
  const postJournalEntry = usePostJournalEntry();

  // New Voucher Form State
  const [voucherType, setVoucherType] = useState<'journal' | 'contra' | 'payment' | 'receipt'>('journal');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<Array<{ account_id: string; debit_amount: string; credit_amount: string; narration: string }>>([
    { account_id: '', debit_amount: '', credit_amount: '', narration: '' },
    { account_id: '', debit_amount: '', credit_amount: '', narration: '' },
  ]);

  // Compute grand totals for Trial Balance
  const tbSummary = useMemo(() => {
    const totalDebit = trialBalance.reduce((sum, item) => sum + item.total_debit, 0);
    const totalCredit = trialBalance.reduce((sum, item) => sum + item.total_credit, 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isBalanced = difference < 0.01;

    return {
      totalDebit,
      totalCredit,
      difference,
      isBalanced,
    };
  }, [trialBalance]);

  // Filtered trial balance items
  const filteredTrialBalance = useMemo(() => {
    return trialBalance.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.classification.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || item.account_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [trialBalance, searchTerm, typeFilter]);

  // Filtered day book journal entries
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      const matchesSearch = !searchTerm ||
        entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.narration || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVoucher = voucherFilter === 'all' || entry.voucher_type === voucherFilter;
      return matchesSearch && matchesVoucher;
    });
  }, [journalEntries, searchTerm, voucherFilter]);

  // Real-time voucher balance calculator
  const voucherBalance = useMemo(() => {
    const totalDr = lines.reduce((sum, l) => sum + (parseFloat(l.debit_amount) || 0), 0);
    const totalCr = lines.reduce((sum, l) => sum + (parseFloat(l.credit_amount) || 0), 0);
    const diff = Math.abs(totalDr - totalCr);
    const isValid = totalDr > 0 && totalCr > 0 && diff < 0.01 && lines.every(l => l.account_id);

    return { totalDr, totalCr, diff, isValid };
  }, [lines]);

  const handleAddLine = () => {
    setLines([...lines, { account_id: '', debit_amount: '', credit_amount: '', narration: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Mutual exclusivity between Debit and Credit in the same row
    if (field === 'debit_amount' && value) {
      newLines[index].credit_amount = '';
    } else if (field === 'credit_amount' && value) {
      newLines[index].debit_amount = '';
    }

    setLines(newLines);
  };

  const handlePostVoucher = async () => {
    if (!voucherBalance.isValid) return;

    await postJournalEntry.mutateAsync({
      voucher_type: voucherType,
      entry_date: entryDate,
      narration: narration.trim() || undefined,
      lines: lines.map(l => ({
        account_id: l.account_id,
        debit_amount: parseFloat(l.debit_amount) || 0,
        credit_amount: parseFloat(l.credit_amount) || 0,
        narration: l.narration.trim() || undefined,
      })),
    });

    setIsNewVoucherOpen(false);
    setNarration('');
    setLines([
      { account_id: '', debit_amount: '', credit_amount: '', narration: '' },
      { account_id: '', debit_amount: '', credit_amount: '', narration: '' },
    ]);
  };

  const handleRefresh = async () => {
    await Promise.all([refetchCOA(), refetchTB(), refetchJE()]);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold glow-text flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-cyan-400" />
            General Ledger & Double-Entry Accounting
          </h1>
          <p className="text-sm sm:text-base text-blue-300">
            ICAI-compliant Chart of Accounts, Day Book vouchers, and real-time Trial Balance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="neon-border bg-slate-800/50 text-blue-200"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Dialog open={isNewVoucherOpen} onOpenChange={setIsNewVoucherOpen}>
            <DialogTrigger asChild>
              <Button className="cyber-button text-white font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                New Journal Voucher
              </Button>
            </DialogTrigger>
            <DialogContent className="futuristic-card max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl text-cyan-300 font-bold flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5" />
                  Post Double-Entry Journal Voucher
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-blue-200 block mb-1">Voucher Type</label>
                    <Select value={voucherType} onValueChange={(val: any) => setVoucherType(val)}>
                      <SelectTrigger className="bg-slate-900 border-blue-500/40 text-blue-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-blue-500/40">
                        <SelectItem value="journal">Journal (F7) - Adjustment</SelectItem>
                        <SelectItem value="contra">Contra (F4) - Cash/Bank</SelectItem>
                        <SelectItem value="payment">Payment (F5) - Disbursement</SelectItem>
                        <SelectItem value="receipt">Receipt (F6) - Collection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-blue-200 block mb-1">Entry Date</label>
                    <Input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="bg-slate-900 border-blue-500/40 text-blue-100"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-blue-200 block mb-1">Narration / Memo</label>
                    <Input
                      placeholder="e.g. Cash transfer to showroom drawer"
                      value={narration}
                      onChange={(e) => setNarration(e.target.value)}
                      className="bg-slate-900 border-blue-500/40 text-blue-100"
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-blue-500/30 rounded-lg overflow-hidden bg-slate-900/60 p-2">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Double-Entry Lines</span>
                    <Button size="sm" variant="ghost" onClick={handleAddLine} className="text-cyan-400 text-xs h-7">
                      <Plus className="w-3 h-3 mr-1" /> Add Account Line
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {lines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-800/40 p-2 rounded">
                        <div className="col-span-5">
                          <Select
                            value={line.account_id}
                            onValueChange={(val) => handleLineChange(idx, 'account_id', val)}
                          >
                            <SelectTrigger className="bg-slate-900/80 border-blue-500/30 text-xs h-8 text-blue-100">
                              <SelectValue placeholder="Select Ledger Account..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-blue-500/40 max-h-60">
                              {coa.filter(a => !a.is_group).map(account => (
                                <SelectItem key={account.id} value={account.id} className="text-xs">
                                  <span className="font-mono text-cyan-400 mr-2">{account.code}</span>
                                  {account.name} ({account.account_type.toUpperCase()})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-3">
                          <Input
                            type="number"
                            placeholder="Debit (₹)"
                            value={line.debit_amount}
                            onChange={(e) => handleLineChange(idx, 'debit_amount', e.target.value)}
                            className="bg-slate-900/80 border-blue-500/30 text-xs h-8 text-right text-green-400 font-semibold"
                          />
                        </div>

                        <div className="col-span-3">
                          <Input
                            type="number"
                            placeholder="Credit (₹)"
                            value={line.credit_amount}
                            onChange={(e) => handleLineChange(idx, 'credit_amount', e.target.value)}
                            className="bg-slate-900/80 border-blue-500/30 text-xs h-8 text-right text-red-400 font-semibold"
                          />
                        </div>

                        <div className="col-span-1 text-center">
                          {lines.length > 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Real-time Balancing Footer */}
                  <div className="mt-3 pt-3 border-t border-blue-500/30 flex justify-between items-center text-xs px-2">
                    <div className="flex items-center gap-4">
                      <span>Total Debit: <strong className="text-green-400">{formatCurrency(voucherBalance.totalDr)}</strong></span>
                      <span>Total Credit: <strong className="text-red-400">{formatCurrency(voucherBalance.totalCr)}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      {voucherBalance.isValid ? (
                        <Badge className="bg-green-500/20 text-green-300 border-green-500/40">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Balanced (₹0.00 diff)
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/40">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Difference: {formatCurrency(voucherBalance.diff)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setIsNewVoucherOpen(false)} className="text-blue-300">
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePostVoucher}
                    disabled={!voucherBalance.isValid || postJournalEntry.isPending}
                    className="cyber-button text-white font-semibold"
                  >
                    {postJournalEntry.isPending ? 'Posting...' : 'Post Balanced Voucher'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Equality Scorecard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="futuristic-card">
          <CardContent className="p-4 pt-6">
            <p className="text-xs text-blue-300 mb-1">Total Debits</p>
            <p className="text-xl sm:text-2xl font-bold text-green-400">
              {formatCurrency(tbSummary.totalDebit)}
            </p>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="p-4 pt-6">
            <p className="text-xs text-blue-300 mb-1">Total Credits</p>
            <p className="text-xl sm:text-2xl font-bold text-red-400">
              {formatCurrency(tbSummary.totalCredit)}
            </p>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="p-4 pt-6">
            <p className="text-xs text-blue-300 mb-1">Double-Entry Status</p>
            <div className="flex items-center gap-2 mt-1">
              {tbSummary.isBalanced ? (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/50 text-sm py-1">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-green-400" />
                  BALANCED (Dr = Cr)
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-sm py-1">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Diff: {formatCurrency(tbSummary.difference)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="p-4 pt-6">
            <p className="text-xs text-blue-300 mb-1">Active Accounts</p>
            <p className="text-xl sm:text-2xl font-bold text-cyan-300">
              {coa.length} <span className="text-xs text-blue-400 font-normal">Standard Ledgers</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="bg-slate-900 border border-blue-500/30 p-1">
          <TabsTrigger value="trial-balance" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300">
            <Layers className="w-4 h-4 mr-2" />
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="day-book" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300">
            <BookOpen className="w-4 h-4 mr-2" />
            Day Book (Vouchers)
          </TabsTrigger>
          <TabsTrigger value="chart-of-accounts" className="data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300">
            <Layers className="w-4 h-4 mr-2" />
            Chart of Accounts Tree
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Trial Balance */}
        <TabsContent value="trial-balance" className="space-y-4 pt-2">
          <Card className="futuristic-card">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg text-cyan-300 flex items-center gap-2">
                  Trial Balance as on {new Date().toLocaleDateString('en-GB')}
                </CardTitle>

                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-blue-400" />
                    <Input
                      placeholder="Search account code/name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 bg-slate-900/80 border-blue-500/30 text-xs h-9 text-blue-100"
                    />
                  </div>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-36 bg-slate-900/80 border-blue-500/30 text-xs h-9 text-blue-100">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-blue-500/40">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="asset">Assets</SelectItem>
                      <SelectItem value="liability">Liabilities</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="overflow-x-auto">
                <Table className="data-grid">
                  <TableHeader>
                    <TableRow className="border-blue-500/30">
                      <TableHead className="text-blue-200">Account Code</TableHead>
                      <TableHead className="text-blue-200">Ledger Account Name</TableHead>
                      <TableHead className="text-blue-200">Group / Classification</TableHead>
                      <TableHead className="text-blue-200">Type</TableHead>
                      <TableHead className="text-right text-blue-200">Debit (₹)</TableHead>
                      <TableHead className="text-right text-blue-200">Credit (₹)</TableHead>
                      <TableHead className="text-right text-blue-200">Closing Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrialBalance.map((item) => (
                      <TableRow key={item.account_id} className="border-blue-500/20">
                        <TableCell className="font-mono text-cyan-400 font-semibold">{item.code}</TableCell>
                        <TableCell className="font-medium text-blue-100">{item.name}</TableCell>
                        <TableCell className="text-blue-300 text-xs">{item.classification}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs uppercase border-blue-500/30 text-blue-200">
                            {item.account_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-400">
                          {item.total_debit > 0 ? formatCurrency(item.total_debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-400">
                          {item.total_credit > 0 ? formatCurrency(item.total_credit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-100">
                          {formatCurrency(Math.abs(item.net_balance))}
                          <span className="text-xs text-blue-400 ml-1">
                            {item.net_balance >= 0 ? (item.normal_balance === 'debit' ? 'Dr' : 'Cr') : (item.normal_balance === 'debit' ? 'Cr' : 'Dr')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Day Book (Journal Entries) */}
        <TabsContent value="day-book" className="space-y-4 pt-2">
          <Card className="futuristic-card">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg text-cyan-300">
                  Day Book — Sequential Audit Log of Accounting Vouchers
                </CardTitle>

                <Select value={voucherFilter} onValueChange={setVoucherFilter}>
                  <SelectTrigger className="w-40 bg-slate-900/80 border-blue-500/30 text-xs h-9 text-blue-100">
                    <SelectValue placeholder="All Vouchers" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-blue-500/40">
                    <SelectItem value="all">All Vouchers</SelectItem>
                    <SelectItem value="contra">Contra (F4)</SelectItem>
                    <SelectItem value="payment">Payment (F5)</SelectItem>
                    <SelectItem value="receipt">Receipt (F6)</SelectItem>
                    <SelectItem value="journal">Journal (F7)</SelectItem>
                    <SelectItem value="sales">Sales (F8)</SelectItem>
                    <SelectItem value="purchase">Purchase (F9)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3">
                {filteredJournalEntries.map((entry) => (
                  <div key={entry.id} className="border border-blue-500/30 rounded-lg p-3 bg-slate-900/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-blue-500/20 gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-cyan-300 border-cyan-500/50">
                          {entry.entry_number}
                        </Badge>
                        <Badge className="bg-blue-600/30 text-blue-200 border-blue-500/30 text-xs uppercase">
                          {entry.voucher_type}
                        </Badge>
                        <span className="text-xs text-blue-400">
                          Date: {new Date(entry.entry_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-blue-300 mr-2">Balanced Total:</span>
                        <span className="font-bold text-cyan-300">{formatCurrency(entry.total_debit)}</span>
                      </div>
                    </div>

                    {entry.narration && (
                      <p className="text-xs text-blue-200 mb-2 italic">"{entry.narration}"</p>
                    )}

                    {/* Double-Entry Lines */}
                    <div className="space-y-1">
                      {entry.journal_entry_lines?.map((line, lIdx) => (
                        <div key={lIdx} className="grid grid-cols-12 text-xs py-1 px-2 rounded bg-slate-800/40 items-center">
                          <div className="col-span-6 font-medium text-blue-100 flex items-center gap-2">
                            <span className="font-mono text-blue-400 text-[10px]">{line.account?.code}</span>
                            <span>{line.account?.name || 'Account'}</span>
                          </div>
                          <div className="col-span-3 text-right font-semibold text-green-400">
                            {line.debit_amount > 0 ? `Dr ${formatCurrency(line.debit_amount)}` : ''}
                          </div>
                          <div className="col-span-3 text-right font-semibold text-red-400">
                            {line.credit_amount > 0 ? `Cr ${formatCurrency(line.credit_amount)}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredJournalEntries.length === 0 && (
                  <div className="text-center py-8 text-blue-400">
                    No journal entries found matching current filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Chart of Accounts Tree */}
        <TabsContent value="chart-of-accounts" className="space-y-4 pt-2">
          <Card className="futuristic-card">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-lg text-cyan-300">
                Chart of Accounts Hierarchy (Standard Tally 28 Groups)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => {
                  const typeAccounts = coa.filter(a => a.account_type === type);
                  return (
                    <div key={type} className="border border-blue-500/30 rounded-lg p-3 bg-slate-900/60">
                      <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wider mb-2 pb-1 border-b border-blue-500/30 flex justify-between">
                        <span>{type}s</span>
                        <span className="text-xs text-blue-400 font-normal">{typeAccounts.length} accounts</span>
                      </h3>
                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {typeAccounts.map(account => (
                          <div key={account.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-slate-800/30 hover:bg-slate-800/60">
                            <div>
                              <span className="font-mono text-cyan-400 mr-2">{account.code}</span>
                              <span className="text-blue-100 font-medium">{account.name}</span>
                            </div>
                            <span className="text-[10px] text-blue-300 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-500/20">
                              {account.classification}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
