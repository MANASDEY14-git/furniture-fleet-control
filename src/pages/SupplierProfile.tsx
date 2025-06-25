
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
    // TODO: Implement PDF/CSV export functionality
    console.log(`Exporting ${format} statement for supplier:`, selectedSupplierData?.name);
  };

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
                  onClick={() => exportStatement('pdf')}
                  className="cyber-button text-white font-semibold"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button 
                  onClick={() => exportStatement('csv')}
                  variant="outline"
                  className="border-blue-500/30 text-blue-200 hover:bg-blue-800/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
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
                  <p className="text-sm text-blue-200 mb-1">Total Purchases</p>
                  <p className="text-2xl font-bold text-cyan-300">
                    {supplierPurchases.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="futuristic-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-200 mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-cyan-300">
                    ₹{supplierPurchases.reduce((sum, p) => sum + p.total_cost, 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="futuristic-card">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-blue-200 mb-1">Outstanding Balance</p>
                  <p className={`text-2xl font-bold ${getTotalBalance() >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                    ₹{Math.abs(getTotalBalance()).toLocaleString('en-IN')}
                    {getTotalBalance() >= 0 ? ' Dr' : ' Cr'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase History */}
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300 glow-text">
                Purchase History ({supplierPurchases.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="data-grid">
                  <TableHeader>
                    <TableRow className="border-blue-500/30">
                      <TableHead className="text-blue-200">Date</TableHead>
                      <TableHead className="text-blue-200">Item</TableHead>
                      <TableHead className="text-blue-200">Invoice #</TableHead>
                      <TableHead className="text-right text-blue-200">Quantity</TableHead>
                      <TableHead className="text-right text-blue-200">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierPurchases.map((purchase) => (
                      <TableRow key={purchase.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                        <TableCell className="text-blue-100">{purchase.date}</TableCell>
                        <TableCell className="text-blue-100">{purchase.item_name}</TableCell>
                        <TableCell className="text-blue-200">{purchase.invoice_number || '-'}</TableCell>
                        <TableCell className="text-right text-cyan-300">{purchase.quantity}</TableCell>
                        <TableCell className="text-right text-cyan-300">₹{purchase.total_cost.toLocaleString('en-IN')}</TableCell>
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
                        <TableCell className="text-blue-100">{entry.transaction_date}</TableCell>
                        <TableCell className="text-blue-200 capitalize">{entry.transaction_type}</TableCell>
                        <TableCell className="text-blue-200">{entry.description}</TableCell>
                        <TableCell className="text-right text-red-400">
                          {entry.debit_amount > 0 ? `₹${entry.debit_amount.toLocaleString('en-IN')}` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-400">
                          {entry.credit_amount > 0 ? `₹${entry.credit_amount.toLocaleString('en-IN')}` : '-'}
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
