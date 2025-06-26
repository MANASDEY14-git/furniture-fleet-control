
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SupplierSelector from '@/components/SupplierSelector';
import { useItems } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';

interface PurchaseItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface MultiItemPurchaseFormProps {
  trigger: React.ReactNode;
}

export default function MultiItemPurchaseForm({ trigger }: MultiItemPurchaseFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    orderNumber: '',
    storeId: '',
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [items, setItems] = useState<PurchaseItem[]>([
    { id: '1', itemId: '', itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }
  ]);

  const { data: availableItems = [] } = useItems();
  const { data: stores = [] } = useStores();
  const createPurchaseOrder = useCreatePurchaseOrder();

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
      unitPrice: 0,
      totalPrice: 0
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
          updatedItem.unitPrice = selectedItem?.cost_price || 0;
        }
        
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => 
      item.itemId && item.quantity > 0 && item.unitPrice > 0
    );
    
    if (validItems.length === 0) {
      alert('Please add at least one valid item');
      return;
    }

    if (!formData.orderNumber.trim()) {
      alert('Please enter an order number');
      return;
    }

    await createPurchaseOrder.mutateAsync({
      order_number: formData.orderNumber,
      store_id: formData.storeId,
      supplier_id: formData.supplierId,
      date: formData.date,
      items: validItems.map(item => ({
        item_id: item.itemId,
        item_name: item.itemName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice
      }))
    });

    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setFormData({
      orderNumber: '',
      storeId: '',
      supplierId: '',
      date: new Date().toISOString().split('T')[0],
    });
    setItems([{ id: '1', itemId: '', itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0 }]);
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
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">Create Purchase Order</DialogTitle>
        </DialogHeader>
        <Card className="border-none shadow-none">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber" className="text-blue-200">Order Number *</Label>
                  <Input
                    id="orderNumber"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({...formData, orderNumber: e.target.value})}
                    required
                    className="neon-border bg-slate-800/50 text-blue-100"
                    placeholder="Enter order number"
                  />
                </div>

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
                        <TableHead className="text-blue-200">Unit Price</TableHead>
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
                              value={item.unitPrice || ''}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="neon-border bg-slate-800/50 text-blue-100 w-28"
                              min="0"
                            />
                          </TableCell>
                          <TableCell className="text-cyan-300 font-semibold">
                            ₹{item.totalPrice.toFixed(2)}
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
                disabled={createPurchaseOrder.isPending || !formData.storeId || !formData.supplierId || !formData.orderNumber}
              >
                {createPurchaseOrder.isPending ? 'Creating Order...' : 'Create Purchase Order'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
