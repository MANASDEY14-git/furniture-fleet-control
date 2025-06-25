
import { useState, useMemo } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import StoreSelector from '@/components/StoreSelector';
import SupplierSelector from '@/components/SupplierSelector';
import SupplierForm from '@/components/SupplierForm';
import { usePurchases, useCreatePurchase, useDeletePurchase } from '@/hooks/usePurchases';
import { useItems } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';

export default function Purchases() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    storeId: '',
    supplierId: '',
    itemId: '',
    quantity: '',
    totalCost: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
  });

  const { data: purchases = [], isLoading: purchasesLoading } = usePurchases();
  const { data: items = [] } = useItems();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const createPurchase = useCreatePurchase();
  const deletePurchase = useDeletePurchase();

  // Filter items by selected supplier and store
  const availableItems = useMemo(() => {
    return items.filter(item => {
      const matchesSupplier = !formData.supplierId || item.supplier_id === formData.supplierId;
      const matchesStore = !formData.storeId || item.store_id === formData.storeId;
      return matchesSupplier && matchesStore;
    });
  }, [items, formData.supplierId, formData.storeId]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const matchesStore = selectedStore === 'all' || purchase.store_id === selectedStore;
      const matchesSupplier = selectedSupplier === 'all' || purchase.supplier_id === selectedSupplier;
      const matchesSearch = purchase.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           purchase.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStore && matchesSupplier && matchesSearch;
    });
  }, [purchases, selectedStore, selectedSupplier, searchTerm]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };

  const getTotalCost = () => {
    return filteredPurchases.reduce((sum, purchase) => sum + purchase.total_cost, 0);
  };

  const getItemName = (itemId: string) => {
    return items.find(item => item.id === itemId)?.name || '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemName = getItemName(formData.itemId);
    
    createPurchase.mutate({
      store_id: formData.storeId,
      supplier_id: formData.supplierId,
      item_id: formData.itemId,
      item_name: itemName,
      quantity: parseInt(formData.quantity),
      total_cost: parseFloat(formData.totalCost),
      invoice_number: formData.invoiceNumber,
      date: formData.date,
    });
    
    setShowForm(false);
    setFormData({
      storeId: '',
      supplierId: '',
      itemId: '',
      quantity: '',
      totalCost: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleDeletePurchase = (purchaseId: string) => {
    deletePurchase.mutate(purchaseId);
  };

  if (purchasesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading purchases...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Purchase Management</h1>
          <p className="text-blue-300">Record inventory purchases with supplier tracking</p>
        </div>
        <div className="flex gap-2">
          <SupplierForm
            trigger={
              <Button className="cyber-button text-white font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            }
          />
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="cyber-button text-white font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? 'Cancel' : 'Add Purchase'}
          </Button>
        </div>
      </div>

      {/* Add Purchase Form */}
      {showForm && (
        <Card className="futuristic-card">
          <CardHeader>
            <CardTitle className="text-cyan-300 glow-text">Record New Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="store" className="text-blue-200">Store *</Label>
                <Select value={formData.storeId} onValueChange={(value) => setFormData({...formData, storeId: value})} required>
                  <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-blue-500/30">
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-blue-800/30">
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier" className="text-blue-200">Supplier *</Label>
                <SupplierSelector 
                  value={formData.supplierId} 
                  onValueChange={(value) => setFormData({...formData, supplierId: value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="item" className="text-blue-200">Item *</Label>
                <Select value={formData.itemId} onValueChange={(value) => setFormData({...formData, itemId: value})} required>
                  <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-blue-500/30">
                    {availableItems.map((item) => (
                      <SelectItem key={item.id} value={item.id} className="text-blue-100 focus:bg-blue-800/30">
                        {item.name} (Current: {item.quantity_available})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceNumber" className="text-blue-200">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="Enter invoice number"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                  className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-blue-200">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  required
                  min="1"
                  className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalCost" className="text-blue-200">Total Cost *</Label>
                <Input
                  id="totalCost"
                  type="number"
                  step="0.01"
                  placeholder="Enter total cost"
                  value={formData.totalCost}
                  onChange={(e) => setFormData({...formData, totalCost: e.target.value})}
                  required
                  min="0"
                  className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-blue-200">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                  className="neon-border bg-slate-800/50 text-blue-100"
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" className="w-full cyber-button text-white font-semibold" disabled={createPurchase.isPending}>
                  {createPurchase.isPending ? 'Recording Purchase...' : 'Record Purchase'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              <Input
                placeholder="Search purchases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>
            <StoreSelector 
              value={selectedStore} 
              onValueChange={setSelectedStore}
              stores={stores}
              isLoading={storesLoading}
              placeholder="All stores"
            />
            <SupplierSelector 
              value={selectedSupplier} 
              onValueChange={setSelectedSupplier}
              includeAll={true}
              placeholder="All suppliers"
            />
            <div className="flex items-center justify-center neon-border bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-md px-4 py-2">
              <span className="text-sm font-medium text-cyan-300 glow-text">
                Total Cost: ₹{getTotalCost().toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">Purchase History ({filteredPurchases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="data-grid">
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Date</TableHead>
                  <TableHead className="text-blue-200">Item</TableHead>
                  <TableHead className="text-blue-200">Store</TableHead>
                  <TableHead className="text-blue-200">Supplier</TableHead>
                  <TableHead className="text-blue-200">Invoice #</TableHead>
                  <TableHead className="text-right text-blue-200">Quantity</TableHead>
                  <TableHead className="text-right text-blue-200">Total Cost</TableHead>
                  <TableHead className="text-right text-blue-200">Cost per Unit</TableHead>
                  <TableHead className="text-right text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="text-blue-100">{purchase.date}</TableCell>
                    <TableCell className="font-medium text-blue-100">{purchase.item_name}</TableCell>
                    <TableCell className="text-blue-200">{getStoreName(purchase.store_id)}</TableCell>
                    <TableCell className="text-blue-200">{getSupplierName(purchase.supplier_id || '')}</TableCell>
                    <TableCell className="text-blue-200">{purchase.invoice_number || '-'}</TableCell>
                    <TableCell className="text-right text-cyan-300">{purchase.quantity}</TableCell>
                    <TableCell className="text-right text-cyan-300 font-semibold">₹{purchase.total_cost.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right text-blue-200">
                      ₹{(purchase.total_cost / purchase.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="futuristic-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-cyan-300">Delete Purchase</AlertDialogTitle>
                            <AlertDialogDescription className="text-blue-200">
                              Are you sure you want to delete this purchase record? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeletePurchase(purchase.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredPurchases.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No purchases found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
