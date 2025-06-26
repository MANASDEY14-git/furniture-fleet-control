
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import SupplierSelector from '@/components/SupplierSelector';
import { useItems } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useCreatePurchase } from '@/hooks/usePurchases';

interface PurchaseItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface MultiItemPurchaseFormProps {
  trigger: React.ReactNode;
}

export default function MultiItemPurchaseForm({ trigger }: MultiItemPurchaseFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    storeId: '',
    supplierId: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState<PurchaseItem[]>([
    { id: '1', itemId: '', itemName: '', quantity: 0, unitCost: 0, totalCost: 0 }
  ]);

  const { data: availableItems = [] } = useItems();
  const { data: stores = [] } = useStores();
  const createPurchase = useCreatePurchase();

  const filteredItems = availableItems.filter(item => {
    const matchesSupplier = !formData.supplierId || item.supplier_id === formData.supplierId;
    const matchesStore = !formData.storeId || item.store_id === formData.storeId;
    return matchesSupplier && matchesStore;
  });

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      itemId: '',
      itemName: '',
      quantity: 0,
      unitCost: 0,
      totalCost: 0
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof PurchaseItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === 'itemId') {
          const selectedItem = filteredItems.find(i => i.id === value);
          updatedItem.itemName = selectedItem?.name || '';
          updatedItem.unitCost = selectedItem?.cost_price || 0;
        }
        
        if (field === 'quantity' || field === 'unitCost') {
          updatedItem.totalCost = updatedItem.quantity * updatedItem.unitCost;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => 
      item.itemId && item.quantity > 0 && item.unitCost > 0
    );
    
    if (validItems.length === 0) {
      alert('Please add at least one valid item');
      return;
    }

    // Create each purchase item separately
    for (const item of validItems) {
      await createPurchase.mutateAsync({
        store_id: formData.storeId,
        supplier_id: formData.supplierId,
        item_id: item.itemId,
        item_name: item.itemName,
        invoice_number: formData.invoiceNumber,
        quantity: item.quantity,
        total_cost: item.totalCost,
        date: formData.date
      });
    }

    // Reset form
    setFormData({
      storeId: '',
      supplierId: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
    });
    setItems([{ id: '1', itemId: '', itemName: '', quantity: 0, unitCost: 0, totalCost: 0 }]);
    setOpen(false);
  };

  const resetForm = () => {
    setFormData({
      storeId: '',
      supplierId: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
    });
    setItems([{ id: '1', itemId: '', itemName: '', quantity: 0, unitCost: 0, totalCost: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto futuristic-card">
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle className="text-cyan-300 glow-text">Multi-Item Purchase Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="invoiceNumber" className="text-blue-200">Invoice Number *</Label>
                  <Input
                    id="invoiceNumber"
                    placeholder="Enter invoice number"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                    required
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
              </div>

              {/* Items Table */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-blue-200">Items</h3>
                  <Button 
                    type="button" 
                    onClick={addItem}
                    className="cyber-button text-white font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table className="data-grid">
                    <TableHeader>
                      <TableRow className="border-blue-500/30">
                        <TableHead className="text-blue-200">Item</TableHead>
                        <TableHead className="text-blue-200">Quantity</TableHead>
                        <TableHead className="text-blue-200">Unit Cost</TableHead>
                        <TableHead className="text-blue-200">Total</TableHead>
                        <TableHead className="text-blue-200">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} className="border-blue-500/20">
                          <TableCell>
                            <Select 
                              value={item.itemId} 
                              onValueChange={(value) => updateItem(item.id, 'itemId', value)}
                            >
                              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100 min-w-[200px]">
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-blue-500/30">
                                {filteredItems.map((availableItem) => (
                                  <SelectItem key={availableItem.id} value={availableItem.id} className="text-blue-100 focus:bg-blue-800/30">
                                    {availableItem.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                              className="neon-border bg-slate-800/50 text-blue-100 w-24"
                              min="1"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unitCost || ''}
                              onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                              className="neon-border bg-slate-800/50 text-blue-100 w-28"
                              min="0"
                            />
                          </TableCell>
                          <TableCell className="text-cyan-300 font-semibold">
                            ₹{item.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={items.length === 1}
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Total */}
                <div className="flex justify-end">
                  <div className="neon-border bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-md px-6 py-3">
                    <span className="text-lg font-bold text-cyan-300 glow-text">
                      Total Amount: ₹{getTotalAmount().toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full cyber-button text-white font-semibold" 
                disabled={createPurchase.isPending || !formData.storeId || !formData.supplierId || !formData.invoiceNumber}
              >
                {createPurchase.isPending ? 'Recording Purchase...' : 'Record Purchase'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
