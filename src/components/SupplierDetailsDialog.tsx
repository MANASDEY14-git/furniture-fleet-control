import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupplierLedger, useSupplierBalances } from '@/hooks/useSupplierLedger';
import { usePurchases } from '@/hooks/usePurchases';
import { usePayments } from '@/hooks/usePayments';
import { Building2, User, Phone, Mail, MapPin, FileText, Receipt, CreditCard, Download } from 'lucide-react';
import QuickPaymentDialog from '@/components/QuickPaymentDialog';
import QuickPurchaseDialog from '@/components/QuickPurchaseDialog';
import ExportButton from '@/components/ExportButton';

interface SupplierDetailsDialogProps {
  supplier: any;
  onClose: () => void;
}

interface LedgerEntryWithBalance {
  id: string;
  transaction_date: string;
  transaction_type: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
  runningBalance: number;
}

export default function SupplierDetailsDialog({ supplier, onClose }: SupplierDetailsDialogProps) {
  const { data: ledgerEntries = [] } = useSupplierLedger(supplier.id);
  const { data: supplierBalances = [] } = useSupplierBalances();
  const { data: purchases = [] } = usePurchases();
  const { data: payments = [] } = usePayments();

  // Calculate running balance for each ledger entry
  const ledgerEntriesWithBalance = useMemo(() => {
    // Get opening balance for this supplier (sum across all stores)
    const openingBalance = supplierBalances
      .filter(b => b.supplier_id === supplier.id)
      .reduce((sum, b) => {
        const value = b.opening_balance_type === 'debit' ? b.opening_balance : -b.opening_balance;
        return sum + value;
      }, 0);

    // Sort entries by date (oldest first) to calculate running balance
    const sortedEntries = [...ledgerEntries].sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    let runningBalance = openingBalance;
    const entriesWithBalance: LedgerEntryWithBalance[] = sortedEntries.map(entry => {
      runningBalance = runningBalance + (entry.debit_amount || 0) - (entry.credit_amount || 0);
      return {
        ...entry,
        runningBalance
      };
    });

    // Reverse to show newest first (matching current display order)
    return entriesWithBalance.reverse();
  }, [ledgerEntries, supplierBalances, supplier.id]);

  // Prepare export data with supplier name added
  const exportData = useMemo(() => {
    return ledgerEntriesWithBalance.map(entry => ({
      ...entry,
      supplier_name: supplier.name
    }));
  }, [ledgerEntriesWithBalance, supplier.name]);

  const supplierPurchases = purchases.filter(p => p.supplier_id === supplier.id);
  const supplierPayments = payments.filter(p => p.supplier_id === supplier.id);

  const totalPurchases = supplierPurchases.reduce((sum, p) => sum + p.total_cost, 0);
  const totalPayments = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalPurchases - totalPayments;

  const getBalanceStatus = (balance: number) => {
    if (balance > 1000) return { label: 'High Due', color: 'bg-red-500' };
    if (balance > 0) return { label: 'Due', color: 'bg-orange-500' };
    if (balance < -1000) return { label: 'Advance', color: 'bg-green-500' };
    return { label: 'Balanced', color: 'bg-blue-500' };
  };

  const status = getBalanceStatus(balance);

  return (
    <div className="space-y-6">
      {/* Supplier Info Card */}
      <Card className="futuristic-card">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-cyan-400" />
              <div>
                <CardTitle className="text-cyan-300">{supplier.name}</CardTitle>
                <p className="text-blue-200">Supplier Details</p>
              </div>
            </div>
            <Badge className={`${status.color} text-white`}>
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-cyan-400" />
                <span className="text-blue-200">Contact Person:</span>
                <span className="text-blue-100">{supplier.contact_person || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-cyan-400" />
                <span className="text-blue-200">Phone:</span>
                <span className="text-blue-100">{supplier.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-cyan-400" />
                <span className="text-blue-200">Email:</span>
                <span className="text-blue-100">{supplier.email || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                <span className="text-blue-200">GSTIN:</span>
                <span className="text-blue-100">{supplier.gstin || 'N/A'}</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-cyan-400 mt-1" />
                <span className="text-blue-200">Address:</span>
                <span className="text-blue-100">{supplier.address || 'N/A'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Purchases</p>
              <p className="text-2xl font-bold text-cyan-300">₹{totalPurchases.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Total Payments</p>
              <p className="text-2xl font-bold text-green-400">₹{totalPayments.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">Balance</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                ₹{Math.abs(balance).toLocaleString('en-IN')}
                {balance >= 0 ? ' Due' : ' Advance'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <QuickPaymentDialog
          supplier={supplier}
          trigger={
            <Button className="cyber-button text-white">
              <Receipt className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
          }
        />
        <QuickPurchaseDialog
          supplier={supplier}
          trigger={
            <Button variant="outline" className="neon-border bg-slate-800/50 text-blue-100">
              <CreditCard className="w-4 h-4 mr-2" />
              New Purchase
            </Button>
          }
        />
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
          <TabsTrigger value="ledger" className="text-blue-200 data-[state=active]:text-cyan-300">
            Ledger ({ledgerEntries.length})
          </TabsTrigger>
          <TabsTrigger value="purchases" className="text-blue-200 data-[state=active]:text-cyan-300">
            Purchases ({supplierPurchases.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-blue-200 data-[state=active]:text-cyan-300">
            Payments ({supplierPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-4">
          <Card className="futuristic-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-cyan-300">Transaction Ledger</CardTitle>
              <ExportButton 
                data={exportData} 
                filename={`${supplier.name.replace(/\s+/g, '_')}_ledger`} 
                type="supplier-ledger" 
              />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-blue-500/30">
                      <TableHead className="text-blue-200">Date</TableHead>
                      <TableHead className="text-blue-200">Type</TableHead>
                      <TableHead className="text-blue-200">Description</TableHead>
                      <TableHead className="text-right text-blue-200">Debit</TableHead>
                      <TableHead className="text-right text-blue-200">Credit</TableHead>
                      <TableHead className="text-right text-blue-200">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntriesWithBalance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-blue-300">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerEntriesWithBalance.map((entry) => (
                        <TableRow key={entry.id} className="border-blue-500/20">
                          <TableCell className="text-blue-100">{entry.transaction_date}</TableCell>
                          <TableCell className="text-blue-200 capitalize">{entry.transaction_type}</TableCell>
                          <TableCell className="text-blue-200">{entry.description}</TableCell>
                          <TableCell className="text-right text-red-400">
                            {entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell className="text-right text-green-400">
                            {entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${entry.runningBalance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                            ₹{Math.abs(entry.runningBalance).toLocaleString('en-IN')}
                            <span className="text-xs ml-1">{entry.runningBalance >= 0 ? 'Dr' : 'Cr'}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="mt-4">
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300">Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-blue-500/30">
                      <TableHead className="text-blue-200">Date</TableHead>
                      <TableHead className="text-blue-200">Invoice</TableHead>
                      <TableHead className="text-blue-200">Items</TableHead>
                      <TableHead className="text-right text-blue-200">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPurchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-blue-300">
                          No purchases found
                        </TableCell>
                      </TableRow>
                    ) : (
                      supplierPurchases.map((purchase) => (
                        <TableRow key={purchase.id} className="border-blue-500/20">
                          <TableCell className="text-blue-100">{purchase.date}</TableCell>
                          <TableCell className="text-blue-200">{purchase.invoice_number || 'N/A'}</TableCell>
                          <TableCell className="text-blue-200">
                            {purchase.item_name}
                          </TableCell>
                          <TableCell className="text-right text-cyan-300">
                            ₹{purchase.total_cost.toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-blue-500/30">
                      <TableHead className="text-blue-200">Date</TableHead>
                      <TableHead className="text-blue-200">Type</TableHead>
                      <TableHead className="text-blue-200">Reference</TableHead>
                      <TableHead className="text-blue-200">Description</TableHead>
                      <TableHead className="text-right text-blue-200">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-blue-300">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      supplierPayments.map((payment) => (
                        <TableRow key={payment.id} className="border-blue-500/20">
                          <TableCell className="text-blue-100">{payment.date}</TableCell>
                          <TableCell className="text-blue-200">{payment.type}</TableCell>
                          <TableCell className="text-blue-200">Bank Transfer</TableCell>
                          <TableCell className="text-blue-200">{payment.description || 'N/A'}</TableCell>
                          <TableCell className="text-right text-green-400">
                            ₹{payment.amount.toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}