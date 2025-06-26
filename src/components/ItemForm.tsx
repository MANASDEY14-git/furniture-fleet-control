
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreateItem, useUpdateItem, Item } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useCategories } from '@/hooks/useCategories';
import { useSuppliers } from '@/hooks/useSuppliers';

interface ItemFormProps {
  item?: Item;
  trigger: React.ReactNode;
}

export default function ItemForm({ item, trigger }: ItemFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item?.name || '');
  const [categoryId, setCategoryId] = useState(item?.category_id || '');
  const [storeId, setStoreId] = useState(item?.store_id || '');
  const [supplierId, setSupplierId] = useState(item?.supplier_id || '');
  const [quantity, setQuantity] = useState(item?.quantity_available?.toString() || '');
  const [costPrice, setCostPrice] = useState(item?.cost_price?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(item?.selling_price?.toString() || '');
  const [stockReceivedDate, setStockReceivedDate] = useState(
    item?.stock_received_date || new Date().toISOString().split('T')[0]
  );

  const { data: stores = [] } = useStores();
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const isEditing = !!item;

  const calculateStockAge = () => {
    if (!stockReceivedDate) return null;
    const today = new Date();
    const receivedDate = new Date(stockReceivedDate);
    const diffTime = Math.abs(today.getTime() - receivedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStockAgeColor = (days: number) => {
    if (days <= 30) return 'bg-green-500';
    if (days <= 90) return 'bg-yellow-500';
    if (days <= 180) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemData = {
      name,
      category_id: categoryId,
      store_id: storeId,
      supplier_id: supplierId || undefined,
      quantity_available: parseInt(quantity),
      cost_price: parseFloat(costPrice),
      selling_price: parseFloat(sellingPrice),
      stock_received_date: stockReceivedDate,
    };

    if (isEditing) {
      updateItem.mutate({ id: item.id, ...itemData });
    } else {
      createItem.mutate(itemData);
    }
    
    setOpen(false);
    if (!isEditing) {
      setName('');
      setCategoryId('');
      setStoreId('');
      setSupplierId('');
      setQuantity('');
      setCostPrice('');
      setSellingPrice('');
      setStockReceivedDate(new Date().toISOString().split('T')[0]);
    }
  };

  const stockAge = calculateStockAge();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">
            {isEditing ? 'Edit Old Stock Item' : 'Add Old Stock Item'}
          </DialogTitle>
        </DialogHeader>
        
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle className="text-blue-200 text-sm">
              Use this form for existing inventory items with known supplier relationships
            </CardTitle>
            {stockAge && (
              <div className="flex items-center gap-2">
                <Badge className={`${getStockAgeColor(stockAge)} text-white`}>
                  Stock Age: {stockAge} days
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-blue-200">Item Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter item name"
                    required
                    className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-blue-200">Category *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId} required>
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
                  <Select value={storeId} onValueChange={setStoreId} required>
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
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                      <SelectValue placeholder="Select supplier (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-blue-500/30">
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id} className="text-blue-100 focus:bg-blue-800/30">
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockReceivedDate" className="text-blue-200">Stock Received Date *</Label>
                  <Input
                    id="stockReceivedDate"
                    type="date"
                    value={stockReceivedDate}
                    onChange={(e) => setStockReceivedDate(e.target.value)}
                    required
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-blue-200">Current Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    required
                    min="0"
                    className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costPrice" className="text-blue-200">Cost Price *</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="Enter cost price"
                    required
                    min="0"
                    className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellingPrice" className="text-blue-200">Selling Price *</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="Enter selling price"
                    required
                    min="0"
                    className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full cyber-button text-white font-semibold" 
                disabled={createItem.isPending || updateItem.isPending}
              >
                {isEditing ? 'Update Item' : 'Add Old Stock Item'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
