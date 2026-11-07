import React from 'react';
import { useCustomerLedger } from '@/hooks/useCustomerLedger';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currencyUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowDownRight, ArrowUpRight, FileText } from 'lucide-react';

export function CustomerLedgerView({ customerId }: { customerId: string }) {
  const { data: ledgerEntries, isLoading, isError, error } = useCustomerLedger(customerId);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (isError) {
    return (
      <div className="text-center p-8 border border-dashed border-red-500/50 rounded-lg text-red-500">
        <p>Error loading ledger: {(error as Error).message}</p>
      </div>
    );
  }

  if (!ledgerEntries || ledgerEntries.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No transactions found for this customer.</p>
      </div>
    );
  }

  // Calculate running balance (assuming chronologically sorted descending)
  // We need to reverse it to calculate running balance properly, then reverse back
  const reversedEntries = [...ledgerEntries].reverse();
  let currentBalance = 0;
  
  const entriesWithBalance = reversedEntries.map(entry => {
    const debit = Number(entry.debit_amount) || 0;
    const credit = Number(entry.credit_amount) || 0;
    
    // In many systems, for customers: Balance = Debit - Credit
    currentBalance += debit - credit;
    
    return {
      ...entry,
      debit,
      credit,
      runningBalance: currentBalance
    };
  }).reverse();

  const getTransactionBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'sale': return <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">Sale</Badge>;
      case 'payment': return <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Payment</Badge>;
      case 'refund': return <Badge variant="outline" className="text-amber-400 border-amber-400/30">Refund</Badge>;
      case 'adjustment': return <Badge variant="outline" className="text-purple-400 border-purple-400/30">Adjustment</Badge>;
      default: return <Badge variant="outline" className="text-slate-400 border-slate-400/30 capitalize">{type}</Badge>;
    }
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-border/50">
          {entriesWithBalance.map((entry) => (
            <div key={entry.id} className="p-3.5 space-y-2 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {new Date(entry.transaction_date).toLocaleDateString('en-GB')}
                </span>
                {getTransactionBadge(entry.transaction_type)}
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm">{entry.notes || 'Transaction'}</p>
                  {entry.reference_id && (
                    <p className="text-[11px] text-muted-foreground font-mono truncate">Ref: {entry.reference_id.substring(0, 12)}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-foreground text-sm">
                    {formatCurrency(Math.abs(entry.runningBalance))}
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      {entry.runningBalance > 0 ? 'Dr' : entry.runningBalance < 0 ? 'Cr' : ''}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">Running Bal</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2 bg-muted/40 rounded-lg text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase block">Debit (Dr)</span>
                  <span className={`font-semibold ${entry.debit > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase block">Credit (Cr)</span>
                  <span className={`font-semibold ${entry.credit > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right text-red-400">Debit (Dr)</TableHead>
                <TableHead className="text-right text-emerald-400">Credit (Cr)</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entriesWithBalance.map((entry) => (
                <TableRow key={entry.id} className="border-border/30 hover:bg-accent/20">
                  <TableCell className="whitespace-nowrap">
                    {new Date(entry.transaction_date).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell>{getTransactionBadge(entry.transaction_type)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{entry.notes || '-'}</span>
                      {entry.reference_id && <span className="text-xs text-muted-foreground font-mono">{entry.reference_id.substring(0, 8)}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-red-400 font-medium">
                    {entry.debit > 0 ? (
                      <span className="flex items-center justify-end gap-1">
                        {formatCurrency(entry.debit)} <ArrowUpRight className="w-3 h-3" />
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-emerald-400 font-medium">
                    {entry.credit > 0 ? (
                      <span className="flex items-center justify-end gap-1">
                        {formatCurrency(entry.credit)} <ArrowDownRight className="w-3 h-3" />
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    {formatCurrency(Math.abs(entry.runningBalance))}
                    <span className="text-[10px] text-muted-foreground ml-1">
                      {entry.runningBalance > 0 ? 'Dr' : entry.runningBalance < 0 ? 'Cr' : ''}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
