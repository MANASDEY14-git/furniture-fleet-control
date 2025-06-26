
import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import SupplierSelector from '@/components/SupplierSelector';
import { useItems } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useCategories } from '@/hooks/useCategories';
import { useCreatePurchase } from '@/hooks/usePurchases';

interface EnhancedPurchaseFormProps {
  trigger: React.ReactNode;
}

export default function EnhancedPurchaseForm({ trigger }: EnhancedPurchaseFormProps) {
  const [open, setOpen] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [formData, setFormData] = useState({
    storeId: '',
    supplierId: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    itemId: '',
    quantity: 0,
    totalCost: 0,
  });

  const [newItemData, setNewItemData] = useState({
    name: '',
    categoryId: '',
    sellingPrice: 0,
  });

  const { data: availableItems = [] } = useItems();
  const { data: stores = [] } = useStores();
  const { data: categories = [] } = useCategories();
  const createPurchase = useCreatePurchase();

  const filteredItems = availableItems.filter(item => {
    const matchesSupplier = !formData.supplierId || item.supplier_id === formData.supplierId;
    const matchesStore = !formData.storeId || item.store_id === formData.storeId;
    return matchesSupplier && matchesStore;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.storeId || !formData.supplierId || !formData.invoiceNumber || formData.quantity <= 0 || formData.totalCost <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    if (isNewItem && (!newItemData.name || !newItemData.categoryId || newItemData.sellingPrice <= 0)) {
      alert('Please fill in all new item details');
      return;
    }

    if (!isNewItem && !formData.itemId) {
      alert('Please select an existing item');
      return;
    }

    const purchaseData = {
      store_id: formData.storeId,
      supplier_id: formData.supplierId,
      item_id: isNewItem ? '' : formData.itemId,
      item_name: isNewItem ? newItemData.name : availableItems.find(i => i.id === formData.itemId)?.name || '',
      invoice_number: formData.invoiceNumber,
      quantity: formData.quantity,
      total_cost: formData.totalCost,
      date: formData.date,
      createNewItem: isNewItem,
      itemData: isNewItem ? {
        name: newItemData.name,
        category_id: newItemData.categoryId,
        selling_price: newItemData.sellingPrice,
      } : undefined
    };

    await createPurchase.mutateAsync(purchaseData);
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setFormData({
      storeId: '',
      supplierId: '',
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      itemId: '',
      quantity: 0,
      totalCost: 0,
    });
    setNewItemData({
      name: '',
      categoryId: '',
      sellingPrice: 0,
    });
    setIsNewItem(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto futuristic-card">
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle className="text-cyan-300 glow-text">Enhanced Purchase Entry</CardTitle>
            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="new-item-mode"
                checked={isNewItem}
                onCheckedChange={setIsNewItem}
              />
              <Label htmlFor="new-item-mode" className="text-blue-200">
                Creating new item for first-time purchase
              </Label>
            </div>
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
                  <Label htmlFor="date" className="text-blue-200">Purchase Date *</Label>
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

              {/* Item Selection/Creation */}
              <Card className="futuristic-card">
                <CardHeader>
                  <CardTitle className="text-blue-200 flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    {isNewItem ? 'New Item Details' : 'Select Existing Item'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isNewItem ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="itemName" className="text-blue-200">Item Name *</Label>
                        <Input
                          id="itemName"
                          placeholder="Enter item name"
                          value={newItemData.name}
                          onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                          required
                          className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-blue-200">Category *</Label>
                        <Select value={newItemData.categoryId} onValueChange={(value) => setNewItemData({...newItemData, categoryId: value})} required>
                          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-blue-500/30">
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id} className="text-blue-100 focus:bg-blue-800/30">
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sellingPrice" className="text-blue-200">Selling Price *</Label>
                        <Input
                          id="sellingPrice"
                          type="number"
                          step="0.01"
                          placeholder="Enter selling price"
                          value={newItemData.sellingPrice || ''}
                          onChange={(e) => setNewItemData({...newItemData, sellingPrice: parseFloat(e.target.value) || 0})}
                          required
                          min="0"
                          className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="existingItem" className="text-blue-200">Select Item *</Label>
                      <Select value={formData.itemId} onValueChange={(value) => setFormData({...formData, itemId: value})} required>
                        <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                          <SelectValue placeholder="Select existing item" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-blue-500/30">
                          {filteredItems.map((item) => (
                            <SelectItem key={item.id} value={item.id} className="text-blue-100 focus:bg-blue-800/30">
                              {item.name} (Stock: {item.quantity_available})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-blue-200">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Enter quantity"
                        value={formData.quantity || ''}
                        onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
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
                        value={formData.totalCost || ''}
                        onChange={(e) => setFormData({...formData, totalCost: parseFloat(e.target.value) || 0})}
                        required
                        min="0"
                        className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                      />
                    </div>
                  </div>

                  {formData.quantity > 0 && formData.totalCost > 0 && (
                    <div className="p-4 neon-border bg-gradient-to-r from-green-400/10 to-cyan-400/10 rounded-md">
                      <p className="text-cyan-300">
                        Unit Cost: ₹{(formData.totalCost / formData.quantity).toFixed(2)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button 
                type="submit" 
                className="w-full cyber-button text-white font-semibold" 
                disabled={createPurchase.isPending}
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
