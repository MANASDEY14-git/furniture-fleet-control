
import { useState } from 'react';
import { Plus, Search, Edit2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SupplierForm from '@/components/SupplierForm';
import ExportButton from '@/components/ExportButton';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { Supplier } from '@/hooks/useSuppliers';

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useSuppliers();

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading suppliers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Suppliers Management</h1>
          <p className="text-blue-300">Manage your suppliers and their information</p>
        </div>
        <div className="flex gap-2">
          <ExportButton 
            data={filteredSuppliers.map(supplier => ({
              'Name': supplier.name,
              'Contact Person': supplier.contact_person || '',
              'Phone': supplier.phone || '',
              'Email': supplier.email || '',
              'Address': supplier.address || '',
              'GSTIN': supplier.gstin || '',
              'Created Date': new Date(supplier.created_at).toLocaleDateString('en-GB')
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

      {/* Summary Card */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-blue-200 mb-1">Total Suppliers</p>
            <p className="text-2xl font-bold text-cyan-300">
              {filteredSuppliers.length}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
            <Input
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">
            Suppliers ({filteredSuppliers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Name</TableHead>
                  <TableHead className="text-blue-200">Contact Person</TableHead>
                  <TableHead className="text-blue-200">Phone</TableHead>
                  <TableHead className="text-blue-200">Email</TableHead>
                  <TableHead className="text-blue-200">GSTIN</TableHead>
                  <TableHead className="text-right text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="font-medium text-cyan-300">{supplier.name}</TableCell>
                    <TableCell className="text-blue-200">{supplier.contact_person || 'N/A'}</TableCell>
                    <TableCell className="text-blue-200">{supplier.phone || 'N/A'}</TableCell>
                    <TableCell className="text-blue-200">{supplier.email || 'N/A'}</TableCell>
                    <TableCell className="text-blue-200">{supplier.gstin || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                          onClick={() => setViewingSupplier(supplier)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                          onClick={() => setEditingSupplier(supplier)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredSuppliers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No suppliers found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Supplier Dialog */}
      <Dialog open={!!editingSupplier} onOpenChange={() => setEditingSupplier(null)}>
        <DialogContent className="futuristic-card">
          <DialogHeader>
            <DialogTitle className="text-cyan-300">Edit Supplier</DialogTitle>
          </DialogHeader>
          {editingSupplier && (
            <SupplierForm
              supplier={editingSupplier}
              onClose={() => setEditingSupplier(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Supplier Dialog */}
      <Dialog open={!!viewingSupplier} onOpenChange={() => setViewingSupplier(null)}>
        <DialogContent className="futuristic-card">
          <DialogHeader>
            <DialogTitle className="text-cyan-300">Supplier Details</DialogTitle>
          </DialogHeader>
          {viewingSupplier && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-200"><strong>Name:</strong> {viewingSupplier.name}</p>
                  <p className="text-blue-200"><strong>Contact Person:</strong> {viewingSupplier.contact_person || 'N/A'}</p>
                  <p className="text-blue-200"><strong>Phone:</strong> {viewingSupplier.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-blue-200"><strong>Email:</strong> {viewingSupplier.email || 'N/A'}</p>
                  <p className="text-blue-200"><strong>GSTIN:</strong> {viewingSupplier.gstin || 'N/A'}</p>
                </div>
              </div>
              {viewingSupplier.address && (
                <div>
                  <p className="text-blue-200"><strong>Address:</strong></p>
                  <p className="text-blue-100 ml-4">{viewingSupplier.address}</p>
                </div>
              )}
              <div className="text-sm text-blue-300">
                <p>Created: {new Date(viewingSupplier.created_at).toLocaleDateString('en-GB')}</p>
                <p>Updated: {new Date(viewingSupplier.updated_at).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
