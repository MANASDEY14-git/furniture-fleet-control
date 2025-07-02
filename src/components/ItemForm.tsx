
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Settings } from 'lucide-react';
import { useItems, useCreateItem, useUpdateItem, type Item } from '@/hooks/useItems';
import { useCategories } from '@/hooks/useCategories';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import SupplierSelector from '@/components/SupplierSelector';
import AttributeManager from '@/components/AttributeManager';
import ItemVariantManager from '@/components/ItemVariantManager';

interface ItemFormProps {
  item?: Item;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function ItemForm({ item, trigger, onSuccess }: ItemFormProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    name: item?.name || '',
    category_id: item?.category_id || '',
    store_id: item?.store_id || '',
    supplier_id: item?.supplier_id || '',
    quantity_available: item?.quantity_available || 0,
    cost_price: item?.cost_price || 0,
    selling_price: item?.selling_price || 0,
    stock_receive_date: item?.stock_receive_date || new Date().toISOString().split('T')[0],
    last_restocked_date: item?.last_restocked_date || new Date().toISOString().split('T')[0],
  });

  const { data: categories = [] } = useCategories();
  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const calculateStockAge = () => {
    if (!formData.stock_receive_date) return 0;
    const receiveDate = new Date(formData.stock_receive_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - receiveDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (item) {
        await updateItem.mutateAsync({
          id: item.id,
          ...formData
        });
      } else {
        await createItem.mutateAsync(formData);
      }
      
      setOpen(false);
      onSuccess?.();
      
      // Reset form for new items
      if (!item) {
        setFormData({
          name: '',
          category_id: '',
          store_id: '',
          supplier_id: '',
          quantity_available: 0,
          cost_price: 0,
          selling_price: 0,
          stock_receive_date: new Date().toISOString().split('T')[0],
          last_restocked_date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const stockAge = calculateStockAge();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Package className="w-5 h-5" />
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
            <TabsTrigger value="basic" className="text-blue-200 data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="variants" className="text-blue-200 data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300" disabled={!item}>
              Variants
            </TabsTrigger>
            <TabsTrigger value="attributes" className="text-blue-200 data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
              <Settings className="w-4 h-4 mr-1" />
              Attributes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-blue-200">Item Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-blue-200">Category *</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})} required>
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
                  <Label htmlFor="store" className="text-blue-200">Store *</Label>
                  <Select value={formData.store_id} onValueChange={(value) => setFormData({...formData, store_id: value})} required>
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
                  <Label htmlFor="supplier" className="text-blue-200">Supplier</Label>
                  <SupplierSelector 
                    value={formData.supplier_id} 
                    onValueChange={(value) => setFormData({...formData, supplier_id: value})}
                    placeholder="Select supplier"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-blue-200">Quantity Available *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity_available}
                    onChange={(e) => setFormData({...formData, quantity_available: parseInt(e.target.value) || 0})}
                    required
                    min="0"
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costPrice" className="text-blue-200">Cost Price *</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})}
                    required
                    min="0"
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellingPrice" className="text-blue-200">Selling Price *</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})}
                    required
                    min="0"
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockDate" className="text-blue-200">Stock Received Date</Label>
                  <Input
                    id="stockDate"
                    type="date"
                    value={formData.stock_receive_date}
                    onChange={(e) => setFormData({...formData, stock_receive_date: e.target.value})}
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                  {formData.stock_receive_date && (
                    <p className="text-sm text-cyan-300">
                      Stock Age: {stockAge} days
                      {stockAge > 90 && <span className="text-orange-400 ml-2">(Aging Stock)</span>}
                      {stockAge > 180 && <span className="text-red-400 ml-2">(Old Stock)</span>}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1 cyber-button text-white font-semibold"
                  disabled={createItem.isPending || updateItem.isPending}
                >
                  {createItem.isPending || updateItem.isPending ? 'Saving...' : (item ? 'Update Item' : 'Add Item')}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpen(false)}
                  className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="variants" className="mt-6">
            {item ? (
              <ItemVariantManager 
                item={item}
                trigger={<div />}
              />
            ) : (
              <div className="text-center py-8 text-blue-300">
                Save the item first to manage variants
              </div>
            )}
          </TabsContent>

          <TabsContent value="attributes" className="mt-6">
            <div className="space-y-4">
              <div className="text-center">
                <AttributeManager />
              </div>
              <div className="text-center text-blue-300 text-sm">
                Manage global attributes that can be used across all items
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
