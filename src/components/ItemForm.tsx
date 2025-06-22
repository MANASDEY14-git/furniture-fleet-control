
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateItem, useUpdateItem, Item } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useCategories } from '@/hooks/useCategories';

interface ItemFormProps {
  item?: Item;
  trigger: React.ReactNode;
}

export default function ItemForm({ item, trigger }: ItemFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item?.name || '');
  const [categoryId, setCategoryId] = useState(item?.category_id || '');
  const [storeId, setStoreId] = useState(item?.store_id || '');
  const [quantity, setQuantity] = useState(item?.quantity_available?.toString() || '');
  const [costPrice, setCostPrice] = useState(item?.cost_price?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(item?.selling_price?.toString() || '');

  const { data: stores = [] } = useStores();
  const { data: categories = [] } = useCategories();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const isEditing = !!item;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemData = {
      name,
      category_id: categoryId,
      store_id: storeId,
      quantity_available: parseInt(quantity),
      cost_price: parseFloat(costPrice),
      selling_price: parseFloat(sellingPrice),
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
      setQuantity('');
      setCostPrice('');
      setSellingPrice('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="store">Store</Label>
            <Select value={storeId} onValueChange={setStoreId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              required
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="costPrice">Cost Price</Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="Enter cost price"
              required
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellingPrice">Selling Price</Label>
            <Input
              id="sellingPrice"
              type="number"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="Enter selling price"
              required
              min="0"
            />
          </div>

          <Button type="submit" className="w-full" disabled={createItem.isPending || updateItem.isPending}>
            {isEditing ? 'Update Item' : 'Add Item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
