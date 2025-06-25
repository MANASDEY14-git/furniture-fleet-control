
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
import StatusBadge from '@/components/StatusBadge';
import { useSales, useCreateSale, useDeleteSale } from '@/hooks/useSales';
import { DeliveryStatus } from '@/types';
import { useItems } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';

export default function Sales() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form state - multi-step
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    storeId: '',
    supplierId: '',
    itemId: '',
    quantity: '',
    totalPrice: '',
    deliveryStatus: DeliveryStatus.Pending,
    date: new Date().toISOString().split('T')[0],
  });

  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: items = [] } = useItems();
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const createSale = useCreateSale();
  const deleteSale = useDeleteSale();

  // Filter items by selected supplier and store
  const availableItems = useMemo(() => {
    return items.filter(item => {
      const matchesSupplier = !formData.supplierId || item.supplier_id === formData.supplierId;
      const matchesStore = !formData.storeId || item.store_id === formData.storeId;
      return matchesSupplier && matchesStore && item.quantity_available > 0; // Only show items with stock
    });
  }, [items, formData.supplierId, formData.storeId]);

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesStore = selectedStore === 'all' || sale.store_id === selectedStore;
      const matchesSupplier = selectedSupplier === 'all' || sale.supplier_id === selectedSupplier;
      const matchesStatus = selectedStatus === 'all' || sale.delivery_status === selectedStatus;
      const matchesSearch = sale.item_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStore && matchesSupplier && matchesStatus && matchesSearch;
    });
  }, [sales, selectedStore, selectedSupplier, selectedStatus, searchTerm]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Unknown Supplier';
  };

  const getTotalSales = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.total_price, 0);
  };

  const getItemName = (itemId: string) => {
    return items.find(item => item.id === itemId)?.name || '';
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemName = getItemName(formData.itemId);
    
    createSale.mutate({
      store_id: formData.storeId,
      supplier_id: formData.supplierId,
      item_id: formData.itemId,
      item_name: itemName,
      quantity: parseInt(formData.quantity),
      total_price: parseFloat(formData.totalPrice),
      delivery_status: formData.deliveryStatus,
      date: formData.date,
    });
    
    setShowForm(false);
    setCurrentStep(1);
    setFormData({
      storeId: '',
      supplierId: '',
      itemId: '',
      quantity: '',
      totalPrice: '',
      deliveryStatus: DeliveryStatus.Pending,
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleDeleteSale = (saleId: string) => {
    deleteSale.mutate(saleId);
  };

  if (salesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading sales...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold glow-text">Sales Command Center</h1>
          <p className="text-blue-300">Track sales with supplier and outlet filtering</p>
        </div>
        <Button 
          onClick={() => {
            setShowForm(!showForm);
            setCurrentStep(1);
          }}
          className="cyber-button text-white font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'Add Sale'}
        </Button>
      </div>

      {/* Multi-step Sale Form */}
      {showForm && (
        <Card className="futuristic-card">
          <CardHeader>
            <CardTitle className="text-cyan-300 glow-text">
              Add New Sale - Step {currentStep} of 3
            </CardTitle>
            <div className="flex space-x-2 mt-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded ${
                    step <= currentStep ? 'bg-cyan-400' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-blue-200">Step 1: Select Outlet</h3>
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
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      onClick={handleNext}
                      disabled={!formData.storeId}
                      className="cyber-button text-white font-semibold"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-blue-200">Step 2: Select Supplier</h3>
                  <div className="space-y-2">
                    <Label htmlFor="supplier" className="text-blue-200">Supplier *</Label>
                    <SupplierSelector 
                      value={formData.supplierId} 
                      onValueChange={(value) => setFormData({...formData, supplierId: value})}
                    />
                  </div>
                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      onClick={handlePrevious}
                      variant="outline"
                      className="border-blue-500/30 text-blue-200 hover:bg-blue-800/20"
                    >
                      Previous
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleNext}
                      disabled={!formData.supplierId}
                      className="cyber-button text-white font-semibold"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-blue-200">
                    Step 3: Select Item & Complete Sale
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="item" className="text-blue-200">Available Items *</Label>
                      <Select value={formData.itemId} onValueChange={(value) => setFormData({...formData, itemId: value})} required>
                        <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-blue-500/30">
                          {availableItems.map((item) => (
                            <SelectItem key={item.id} value={item.id} className="text-blue-100 focus:bg-blue-800/30">
                              {item.name} (Available: {item.quantity_available})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <p className="text-xs text-blue-400">Note: Negative stock is allowed for pre-orders</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="totalPrice" className="text-blue-200">Total Price *</Label>
                      <Input
                        id="totalPrice"
                        type="number"
                        step="0.01"
                        placeholder="Enter total price"
                        value={formData.totalPrice}
                        onChange={(e) => setFormData({...formData, totalPrice: e.target.value})}
                        required
                        min="0"
                        className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deliveryStatus" className="text-blue-200">Delivery Status</Label>
                      <Select 
                        value={formData.deliveryStatus} 
                        onValueChange={(value: DeliveryStatus) => setFormData({...formData, deliveryStatus: value})}
                      >
                        <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-blue-500/30">
                          <SelectItem value={DeliveryStatus.Pending} className="text-blue-100 focus:bg-blue-800/30">Pending</SelectItem>
                          <SelectItem value={DeliveryStatus.PaidInFull} className="text-blue-100 focus:bg-blue-800/30">Paid in Full</SelectItem>
                          <SelectItem value={DeliveryStatus.Delivered} className="text-blue-100 focus:bg-blue-800/30">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-blue-200">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        required
                        className="neon-border bg-slate-800/50 text-blue-100"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      onClick={handlePrevious}
                      variant="outline"
                      className="border-blue-500/30 text-blue-200 hover:bg-blue-800/20"
                    >
                      Previous
                    </Button>
                    <Button type="submit" className="cyber-button text-white font-semibold" disabled={createSale.isPending}>
                      {createSale.isPending ? 'Processing Sale...' : 'Execute Sale'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>
            <StoreSelector 
              value={selectedStore} 
              onValueChange={setSelectedStore}
              stores={stores}
              isLoading={false}
              placeholder="All stores"
            />
            <SupplierSelector 
              value={selectedSupplier} 
              onValueChange={setSelectedSupplier}
              includeAll={true}
              placeholder="All suppliers"
            />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/30">
                <SelectItem value="all" className="text-blue-100 focus:bg-blue-800/30">All Statuses</SelectItem>
                <SelectItem value="Pending" className="text-blue-100 focus:bg-blue-800/30">Pending</SelectItem>
                <SelectItem value="Paid in Full" className="text-blue-100 focus:bg-blue-800/30">Paid in Full</SelectItem>
                <SelectItem value="Delivered" className="text-blue-100 focus:bg-blue-800/30">Delivered</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center neon-border bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-md px-4 py-2">
              <span className="text-sm font-medium text-cyan-300 glow-text">
                Total Sales: ₹{getTotalSales().toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text">Sales Database ({filteredSales.length})</CardTitle>
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
                  <TableHead className="text-right text-blue-200">Quantity</TableHead>
                  <TableHead className="text-right text-blue-200">Total Price</TableHead>
                  <TableHead className="text-blue-200">Status</TableHead>
                  <TableHead className="text-right text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                    <TableCell className="text-blue-100">{sale.date}</TableCell>
                    <TableCell className="font-medium text-blue-100">{sale.item_name}</TableCell>
                    <TableCell className="text-blue-200">{getStoreName(sale.store_id)}</TableCell>
                    <TableCell className="text-blue-200">{getSupplierName(sale.supplier_id || '')}</TableCell>
                    <TableCell className="text-right text-cyan-300">{sale.quantity}</TableCell>
                    <TableCell className="text-right text-cyan-300 font-semibold">₹{sale.total_price.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <StatusBadge status={sale.delivery_status} />
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
                            <AlertDialogTitle className="text-cyan-300">Delete Sale</AlertDialogTitle>
                            <AlertDialogDescription className="text-blue-200">
                              Are you sure you want to delete this sale record? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteSale(sale.id)}
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
          {filteredSales.length === 0 && (
            <div className="text-center py-8">
              <p className="text-blue-300">No sales found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
