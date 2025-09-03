
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import SupplierSelector from '@/components/SupplierSelector';
import type { Item } from '@/hooks/useItems';

interface ItemBasicInfoFormProps {
  item?: Item;
  onSubmit: (formData: any) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export default function ItemBasicInfoForm({ item, onSubmit, onCancel, isLoading }: ItemBasicInfoFormProps) {
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

  const calculateStockAge = () => {
    if (!formData.stock_receive_date) return 0;
    const receiveDate = new Date(formData.stock_receive_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - receiveDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const stockAge = calculateStockAge();

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
        <div className="space-y-3 md:space-y-2">
          <Label htmlFor="name" className="text-foreground text-base md:text-sm font-medium">Item Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
            className="h-12 md:h-10 text-base md:text-sm bg-background border-border focus:border-primary"
          />
        </div>

        <div className="space-y-3 md:space-y-2">
          <Label htmlFor="category" className="text-foreground text-base md:text-sm font-medium">Category *</Label>
          <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})} required>
            <SelectTrigger className="h-12 md:h-10 text-base md:text-sm bg-background border-border focus:border-primary">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id} className="text-base md:text-sm py-3 md:py-2">
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 md:space-y-2">
          <Label htmlFor="store" className="text-foreground text-base md:text-sm font-medium">Store *</Label>
          <Select value={formData.store_id} onValueChange={(value) => setFormData({...formData, store_id: value})} required>
            <SelectTrigger className="h-12 md:h-10 text-base md:text-sm bg-background border-border focus:border-primary">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id} className="text-base md:text-sm py-3 md:py-2">
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 md:space-y-2">
          <Label htmlFor="supplier" className="text-foreground text-base md:text-sm font-medium">Supplier</Label>
          <SupplierSelector 
            value={formData.supplier_id} 
            onValueChange={(value) => setFormData({...formData, supplier_id: value})}
            placeholder="Select supplier"
          />
        </div>

        <div className="space-y-3 md:space-y-2">
          <Label htmlFor="quantity" className="text-foreground text-base md:text-sm font-medium">Quantity Available *</Label>
          <Input
            id="quantity"
            type="number"
            value={formData.quantity_available}
            onChange={(e) => setFormData({...formData, quantity_available: parseInt(e.target.value) || 0})}
            required
            min="0"
            className="h-12 md:h-10 text-base md:text-sm bg-background border-border focus:border-primary"
          />
        </div>

        <div className="space-y-3 md:space-y-2">
          <Label htmlFor="costPrice" className="text-foreground text-base md:text-sm font-medium">Cost Price *</Label>
          <Input
            id="costPrice"
            type="number"
            step="0.01"
            value={formData.cost_price}
            onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})}
            required
            min="0"
            className="h-12 md:h-10 text-base md:text-sm bg-background border-border focus:border-primary"
          />
        </div>

        <div className="space-y-3 md:space-y-2">
          <Label htmlFor="sellingPrice" className="text-foreground text-base md:text-sm font-medium">Selling Price *</Label>
          <Input
            id="sellingPrice"
            type="number"
            step="0.01"
            value={formData.selling_price}
            onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})}
            required
            min="0"
            className="h-12 md:h-10 text-base md:text-sm bg-background border-border focus:border-primary"
          />
        </div>

        <div className="space-y-3 md:space-y-2">
          <Label htmlFor="stockDate" className="text-foreground text-base md:text-sm font-medium">Stock Received Date</Label>
          <Input
            id="stockDate"
            type="date"
            value={formData.stock_receive_date}
            onChange={(e) => setFormData({...formData, stock_receive_date: e.target.value})}
            className="h-12 md:h-10 text-base md:text-sm bg-background border-border focus:border-primary"
          />
          {formData.stock_receive_date && (
            <p className="text-sm text-muted-foreground">
              Stock Age: {stockAge} days
              {stockAge > 90 && <span className="text-orange-500 ml-2">(Aging Stock)</span>}
              {stockAge > 180 && <span className="text-destructive ml-2">(Old Stock)</span>}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 pt-6 md:pt-4 border-t bg-background sticky bottom-0 -mx-6 px-6 py-4 md:relative md:mx-0 md:px-0 md:py-0 md:border-t-0 md:bg-transparent">
        <Button 
          type="submit" 
          className="h-12 md:h-10 text-base md:text-sm font-semibold flex-1 order-2 sm:order-1"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (item ? 'Update Item' : 'Add Item')}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="h-12 md:h-10 text-base md:text-sm order-1 sm:order-2 sm:w-auto"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
