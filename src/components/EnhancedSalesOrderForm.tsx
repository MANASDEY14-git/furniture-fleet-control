
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import SupplierSelector from '@/components/SupplierSelector';
import { useItems } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useCreateSalesOrder } from '@/hooks/useSalesOrders';
import { DeliveryStatus } from '@/types';
import ItemVariantSelector from '@/components/ItemVariantSelector';

interface OrderItem {
  id: string;
  itemId: string;
  variantId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
}

interface EnhancedSalesOrderFormProps {
  trigger: React.ReactNode;
}

export default function EnhancedSalesOrderForm({ trigger }: EnhancedSalesOrderFormProps) {
  const [open, setOpen] = useState(false);
  const [isWalkInCustomer, setIsWalkInCustomer] = useState(false);
  const [formData, setFormData] = useState({
    orderNumber: '',
    storeId: '',
    supplierId: '',
    deliveryStatus: DeliveryStatus.Pending,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    deliveryDate: '',
    advancePaid: 0,
  });

  const [items, setItems] = useState<OrderItem[]>([
    { id: '1', itemId: '', variantId: '', itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, availableStock: 0 }
  ]);

  const { data: availableItems = [] } = useItems();
  const { data: stores = [] } = useStores();
  const createSalesOrder = useCreateSalesOrder();

  const filteredItems = availableItems.filter(item => {
    const matchesSupplier = isWalkInCustomer || !formData.supplierId || item.supplier_id === formData.supplierId;
    const matchesStore = !formData.storeId || item.store_id === formData.storeId;
    return matchesSupplier && matchesStore;
  });

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      itemId: '',
      variantId: '',
      itemName: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      availableStock: 0
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === 'itemId') {
          const selectedItem = filteredItems.find(i => i.id === value);
          updatedItem.itemName = selectedItem?.name || '';
          updatedItem.unitPrice = selectedItem?.selling_price || 0;
          updatedItem.availableStock = selectedItem?.quantity_available || 0;
          updatedItem.variantId = ''; // Reset variant when item changes
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

  const getBalanceDue = () => {
    return getTotalAmount() - formData.advancePaid;
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

    const supplierId = isWalkInCustomer ? null : formData.supplierId;

    await createSalesOrder.mutateAsync({
      order_number: formData.orderNumber,
      store_id: formData.storeId,
      supplier_id: supplierId,
      delivery_status: formData.deliveryStatus,
      date: formData.date,
      customer_name: formData.customerName || null,
      customer_phone: formData.customerPhone || null,
      customer_address: formData.customerAddress || null,
      delivery_date: formData.deliveryDate || null,
      advance_paid: formData.advancePaid,
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
      deliveryStatus: DeliveryStatus.Pending,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      deliveryDate: '',
      advancePaid: 0,
    });
    setItems([{ id: '1', itemId: '', variantId: '', itemName: '', quantity: 0, unitPrice: 0, totalPrice: 0, availableStock: 0 }]);
    setIsWalkInCustomer(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto futuristic-card" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">Create Sales Order</DialogTitle>
        </DialogHeader>
        <Card className="border-none shadow-none">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <select
                    value={formData.storeId}
                    onChange={(e) => setFormData({...formData, storeId: e.target.value})}
                    required
                    className="w-full p-2 rounded border bg-slate-800 text-blue-100 border-blue-500/30"
                  >
                    <option value="">Select Store</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
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

              {/* Customer Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="walkInCustomer"
                    checked={isWalkInCustomer}
                    onCheckedChange={(checked) => {
                      setIsWalkInCustomer(checked as boolean);
                      if (checked) {
                        setFormData({...formData, supplierId: ''});
                      }
                    }}
                  />
                  <Label htmlFor="walkInCustomer" className="text-blue-200">Walk-in Customer</Label>
                </div>

                {!isWalkInCustomer && (
                  <div className="space-y-2">
                    <Label htmlFor="supplier" className="text-blue-200">Supplier *</Label>
                    <SupplierSelector 
                      value={formData.supplierId} 
                      onValueChange={(value) => setFormData({...formData, supplierId: value})}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName" className="text-blue-200">Customer Name</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      className="neon-border bg-slate-800/50 text-blue-100"
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone" className="text-blue-200">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                      className="neon-border bg-slate-800/50 text-blue-100"
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate" className="text-blue-200">Delivery Date</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                      className="neon-border bg-slate-800/50 text-blue-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerAddress" className="text-blue-200">Customer Address</Label>
                  <Textarea
                    id="customerAddress"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                    className="neon-border bg-slate-800/50 text-blue-100"
                    placeholder="Full delivery address"
                    rows={2}
                  />
                </div>
              </div>

              {/* Items Section */}
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
                        <TableHead className="text-blue-200">Variant</TableHead>
                        <TableHead className="text-blue-200">Available</TableHead>
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
                            <select
                              value={item.itemId}
                              onChange={(e) => updateItem(item.id, 'itemId', e.target.value)}
                              className="w-full p-2 rounded border bg-slate-800 text-blue-100 border-blue-500/30 min-w-[200px]"
                            >
                              <option value="">Select item</option>
                              {filteredItems.map((availableItem) => (
                                <option key={availableItem.id} value={availableItem.id}>
                                  {availableItem.name}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            {item.itemId ? (
                              <ItemVariantSelector
                                itemId={item.itemId}
                                value={item.variantId}
                                onValueChange={(variantId, variantData) => {
                                  updateItem(item.id, 'variantId', variantId);
                                  if (variantData) {
                                    updateItem(item.id, 'unitPrice', variantData.selling_price);
                                    updateItem(item.id, 'availableStock', variantData.quantity_available);
                                  }
                                }}
                                placeholder="Select variant"
                              />
                            ) : (
                              <span className="text-gray-400 text-sm">Select item first</span>
                            )}
                          </TableCell>
                          <TableCell className="text-cyan-300">
                            {item.availableStock}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantity || ''}
                              onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                              className="neon-border bg-slate-800/50 text-blue-100 w-24"
                              min="1"
                            />
                            {item.quantity > item.availableStock && (
                              <p className="text-xs text-orange-400 mt-1">Low stock warning</p>
                            )}
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
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="advancePaid" className="text-blue-200">Advance Paid</Label>
                  <Input
                    id="advancePaid"
                    type="number"
                    step="0.01"
                    value={formData.advancePaid || ''}
                    onChange={(e) => setFormData({...formData, advancePaid: parseFloat(e.target.value) || 0})}
                    className="neon-border bg-slate-800/50 text-blue-100"
                    min="0"
                    max={getTotalAmount()}
                  />
                </div>

                <div className="space-y-4">
                  <div className="neon-border bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-md p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-blue-200">Total Amount:</span>
                      <span className="text-cyan-300 font-bold">₹{getTotalAmount().toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-200">Advance Paid:</span>
                      <span className="text-green-400 font-bold">₹{formData.advancePaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-500/30 pt-2">
                      <span className="text-blue-200">Balance Due:</span>
                      <span className="text-orange-400 font-bold">₹{getBalanceDue().toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full cyber-button text-white font-semibold" 
                disabled={createSalesOrder.isPending || !formData.storeId || (!isWalkInCustomer && !formData.supplierId) || !formData.orderNumber}
              >
                {createSalesOrder.isPending ? 'Creating Order...' : 'Create Sales Order'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
