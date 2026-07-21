
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import SupplierSelector from '@/components/SupplierSelector';
import { useSupplierLedger } from '@/hooks/useSupplierLedger';
import { usePurchases } from '@/hooks/usePurchases';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/currencyUtils';
import { exportToCSV, exportToJSON } from '@/utils/exportUtils';

export default function SupplierProfile() {
  const [selectedSupplier, setSelectedSupplier] = useState('');

  const { data: suppliers = [] } = useSuppliers();
  const { data: ledgerEntries = [], isLoading: ledgerLoading } = useSupplierLedger(
    selectedSupplier || undefined
  );
  const { data: purchases = [], isLoading: purchasesLoading } = usePurchases();

  const selectedSupplierData = suppliers.find(s => s.id === selectedSupplier);
  const supplierPurchases = purchases.filter(p => p.supplier_id === selectedSupplier);

  const getTotalBalance = () => {
    return ledgerEntries.reduce((sum, entry) => 
      sum + (entry.debit_amount || 0) - (entry.credit_amount || 0), 0
    );
  };

  const exportStatement = (format: 'pdf' | 'csv') => {
    if (!selectedSupplierData) return;
    
    const exportData = ledgerEntries.map(entry => ({
      'Date': new Date(entry.transaction_date).toLocaleDateString('en-GB'),
      'Type': entry.transaction_type,
      'Description': entry.description || 'N/A',
      'Invoice Number': entry.invoice_number || 'N/A',
      'Debit Amount': entry.debit_amount || 0,
      'Credit Amount': entry.credit_amount || 0
    }));

    const filename = `supplier-statement-${selectedSupplierData.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(exportData, filename);
    } else {
      exportToJSON(exportData, filename);
    }
    
    console.log(`Exporting ${format} statement for supplier:`, selectedSupplierData.name);
  };

  // Group purchases by invoice for better display
  const groupedPurchases = supplierPurchases.reduce((acc, purchase) => {
    const key = purchase.invoice_number || `${purchase.date}-${purchase.id}`;
    if (!acc[key]) {
      acc[key] = {
        invoice_number: purchase.invoice_number,
        date: purchase.date,
        items: [],
        total_amount: 0
      };
    }
    acc[key].items.push(purchase);
    acc[key].total_amount += purchase.total_cost;
    return acc;
  }, {} as Record<string, any>);

  const invoiceEntries = Object.values(groupedPurchases);

  if (ledgerLoading || purchasesLoading) {
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
        <h1 className="text-3xl font-bold glow-text">Supplier Profile</h1>
        <p className="text-blue-300">View detailed supplier information and transaction history</p>
      </div>

      {/* Supplier Selection */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="max-w-md">
            <SupplierSelector 
              value={selectedSupplier} 
              onValueChange={setSelectedSupplier}
              placeholder="Select a supplier to view profile"
            />
          </div>
        </CardContent>
      </Card>

      {selectedSupplier && selectedSupplierData && (
        <>
          {/* Supplier Details */}
          <Card className="futuristic-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-cyan-300 glow-text">
                {selectedSupplierData.name}
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={() => exportStatement('csv')}
                  className="cyber-button text-white font-semibold"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  onClick={() => exportStatement('pdf')}
                  variant="outline"
                  className="border-blue-500/30 text-blue-200 hover:bg-blue-800/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-blue-200">Contact Person</p>
                  <p className="text-blue-100">{selectedSupplierData.contact_person || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-200">Phone</p>
                  <p className="text-blue-100">{selectedSupplierData.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-200">Email</p>
                  <p className="text-blue-100">{selectedSupplierData.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-200">GSTIN</p>
                  <p className="text-blue-100">{selectedSupplierData.gstin || 'N/A'}</p>
                </div>
              </div>
              {selectedSupplierData.address && (
                <div className="mt-4">
                  <p className="text-sm text-blue-200">Address</p>
                  <p className="text-blue-100">{selectedSupplierData.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="futuristic-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-200 mb-1">Total Invoices</p>
                  <p className="text-2xl font-bold text-cyan-300">
                    {invoiceEntries.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="futuristic-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-200 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-cyan-300">
                    {formatCurrency(supplierPurchases.reduce((sum, p) => sum + p.total_cost, 0))}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="futuristic-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-200 mb-1">Outstanding Balance</p>
                  <p className={`text-2xl font-bold ${getTotalBalance() >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(Math.abs(getTotalBalance()))}
                    {getTotalBalance() >= 0 ? ' Dr' : ' Cr'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice History */}
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300 glow-text">
                Invoice History ({invoiceEntries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="data-grid">
                  <TableHeader>
                    <TableRow className="border-blue-500/30">
                      <TableHead className="text-blue-200">Date</TableHead>
                      <TableHead className="text-blue-200">Invoice #</TableHead>
                      <TableHead className="text-blue-200">Description</TableHead>
                      <TableHead className="text-right text-blue-200">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceEntries.map((invoice, index) => (
                      <TableRow key={index} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                        <TableCell className="text-blue-100">
                          {new Date(invoice.date).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell className="text-blue-200">{invoice.invoice_number || '-'}</TableCell>
                        <TableCell className="text-blue-200">
                          Invoice: {invoice.items.map((item: any) => item.item_name).join(', ')}
                        </TableCell>
                        <TableCell className="text-right text-cyan-300 font-semibold">
                          {formatCurrency(invoice.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Ledger Entries */}
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300 glow-text">
                Ledger Entries ({ledgerEntries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="data-grid">
                  <TableHeader>
                    <TableRow className="border-blue-500/30">
                      <TableHead className="text-blue-200">Date</TableHead>
                      <TableHead className="text-blue-200">Type</TableHead>
                      <TableHead className="text-blue-200">Description</TableHead>
                      <TableHead className="text-right text-blue-200">Debit</TableHead>
                      <TableHead className="text-right text-blue-200">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.map((entry) => (
                      <TableRow key={entry.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                        <TableCell className="text-blue-100">
                          {new Date(entry.transaction_date).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell className="text-blue-200 capitalize">{entry.transaction_type}</TableCell>
                        <TableCell className="text-blue-200">{entry.description}</TableCell>
                        <TableCell className="text-right text-red-400">
                          {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-400">
                          {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
