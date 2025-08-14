
import React, { useState, useEffect } from 'react';
import { Plus, Users, Receipt, CreditCard, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useSupplierBalances } from '@/hooks/useSupplierLedger';
import SupplierForm from '@/components/SupplierForm';
import SupplierDetailsDialog from '@/components/SupplierDetailsDialog';
import QuickPaymentDialog from '@/components/QuickPaymentDialog';
import QuickPurchaseDialog from '@/components/QuickPurchaseDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ExportButton from '@/components/ExportButton';

export default function Suppliers() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const { data: balances = [] } = useSupplierBalances();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('suppliers-listen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => {
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_ledger' }, () => {
        queryClient.invalidateQueries({ queryKey: ['supplier-balances'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSupplierBalance = (supplierId) => {
    const balance = balances.find(b => b.supplier_id === supplierId);
    return balance ? balance.balance : 0;
  };

  const getBalanceStatus = (balance) => {
    if (balance > 1000) return { label: 'High Due', color: 'bg-red-500' };
    if (balance > 0) return { label: 'Due', color: 'bg-orange-500' };
    if (balance < -1000) return { label: 'Advance', color: 'bg-green-500' };
    return { label: 'Balanced', color: 'bg-blue-500' };
  };

  const totalSuppliers = suppliers.length;
  const totalOutstanding = balances.reduce((sum, b) => sum + Math.max(0, b.balance), 0);
  const totalAdvances = balances.reduce((sum, b) => sum + Math.max(0, -b.balance), 0);
  const suppliersWithDues = balances.filter(b => b.balance > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-300 glow-text">Supplier Management</h1>
          <p className="text-blue-200">Manage suppliers, balances, and transactions</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={filteredSuppliers.map(supplier => ({
              'Name': supplier.name,
              'Contact Person': supplier.contact_person || 'N/A',
              'Phone': supplier.phone || 'N/A',
              'Email': supplier.email || 'N/A',
              'GSTIN': supplier.gstin || 'N/A',
              'Address': supplier.address || 'N/A',
              'Balance': getSupplierBalance(supplier.id)
            }))} 
            filename="suppliers" 
            type="items"
          />
          <SupplierForm
            trigger={
              <Button className="cyber-button text-white font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            }
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-cyan-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-200">Total Suppliers</p>
                <p className="text-2xl font-bold text-cyan-300">{totalSuppliers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-200">Outstanding Amount</p>
                <p className="text-2xl font-bold text-red-400">₹{totalOutstanding.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-200">Advance Payments</p>
                <p className="text-2xl font-bold text-green-400">₹{totalAdvances.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="futuristic-card">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-200">Suppliers with Dues</p>
                <p className="text-2xl font-bold text-orange-400">{suppliersWithDues}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Suppliers Directory
          </CardTitle>
          <div className="mt-4">
            <Input
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Name</TableHead>
                  <TableHead className="text-blue-200">Contact Person</TableHead>
                  <TableHead className="text-blue-200">Phone</TableHead>
                  <TableHead className="text-blue-200">Email</TableHead>
                  <TableHead className="text-blue-200">Balance</TableHead>
                  <TableHead className="text-blue-200">Status</TableHead>
                  <TableHead className="text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-blue-300">
                      Loading suppliers...
                    </TableCell>
                  </TableRow>
                ) : filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-blue-300">
                      No suppliers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => {
                    const balance = getSupplierBalance(supplier.id);
                    const status = getBalanceStatus(balance);
                    return (
                      <TableRow key={supplier.id} className="border-blue-500/20 hover:bg-blue-900/20">
                        <TableCell className="font-medium text-blue-100">{supplier.name}</TableCell>
                        <TableCell className="text-blue-200">{supplier.contact_person || 'N/A'}</TableCell>
                        <TableCell className="text-blue-200">{supplier.phone || 'N/A'}</TableCell>
                        <TableCell className="text-blue-200">{supplier.email || 'N/A'}</TableCell>
                        <TableCell className={`text-right font-medium ${balance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                          ₹{Math.abs(balance).toLocaleString('en-IN')}
                          {balance >= 0 ? ' Due' : ' Advance'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.color} text-white`}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="neon-border bg-slate-800/50 text-blue-100"
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setViewDialogOpen(true);
                              }}
                            >
                              View
                            </Button>
                            <SupplierForm
                              supplier={supplier}
                              trigger={
                                <Button variant="outline" size="sm" className="neon-border bg-slate-800/50 text-blue-100">
                                  Edit
                                </Button>
                              }
                            />
                            <QuickPaymentDialog
                              supplier={supplier}
                              trigger={
                                <Button variant="outline" size="sm" className="neon-border bg-slate-800/50 text-blue-100">
                                  <Receipt className="w-4 h-4" />
                                </Button>
                              }
                            />
                            <QuickPurchaseDialog
                              supplier={supplier}
                              trigger={
                                <Button variant="outline" size="sm" className="neon-border bg-slate-800/50 text-blue-100">
                                  <Plus className="w-4 h-4" />
                                </Button>
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto futuristic-card">
          <DialogHeader>
            <DialogTitle className="text-cyan-300 glow-text">
              {selectedSupplier?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <SupplierDetailsDialog 
              supplier={selectedSupplier} 
              onClose={() => setViewDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
