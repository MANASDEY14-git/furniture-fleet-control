import React from 'react';
import { useCustomerLedger } from '@/hooks/useCustomerLedger';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currencyUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowDownRight, ArrowUpRight, FileText } from 'lucide-react';

export function CustomerLedgerView({ customerId }: { customerId: string }) {
  const { data: ledgerEntries, isLoading } = useCustomerLedger(customerId);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

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
    // Debit increases customer balance (they owe us more)
    // Credit decreases customer balance (they owe us less)
    const debit = Number(entry.amount) > 0 && ['Sale', 'Adjustment'].includes(entry.transaction_type) ? Number(entry.amount) : 0;
    const credit = Number(entry.amount) > 0 && ['Payment', 'Refund'].includes(entry.transaction_type) ? Number(entry.amount) : 0;
    
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
    switch (type) {
      case 'Sale': return <Badge variant="outline" className="text-cyan-400 border-cyan-400/30">Sale</Badge>;
      case 'Payment': return <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">Payment</Badge>;
      case 'Refund': return <Badge variant="outline" className="text-amber-400 border-amber-400/30">Refund</Badge>;
      default: return <Badge variant="outline" className="text-slate-400 border-slate-400/30">{type}</Badge>;
    }
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
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
                    {new Date(entry.date).toLocaleDateString('en-GB')}
                  </TableCell>
                  <TableCell>{getTransactionBadge(entry.transaction_type)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{entry.description}</span>
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
