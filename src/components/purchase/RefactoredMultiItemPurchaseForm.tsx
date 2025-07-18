
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useItems } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useCategories } from '@/hooks/useCategories';
import { useCreatePurchase } from '@/hooks/usePurchases';
import PurchaseFormBasicInfo from './PurchaseFormBasicInfo';
import PurchaseItemsTable from './PurchaseItemsTable';

interface PurchaseItem {
  id: string;
  itemId: string;
  variantId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isNewItem: boolean;
  newItemName: string;
  newItemSellingPrice: number;
  newItemCostPrice: number;
  newItemCategoryId: string;
}

interface RefactoredMultiItemPurchaseFormProps {
  trigger: React.ReactNode;
}

export default function RefactoredMultiItemPurchaseForm({ trigger }: RefactoredMultiItemPurchaseFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    supplierId: '',
    storeId: '',
  });

  const [items, setItems] = useState<PurchaseItem[]>([
    {
      id: '1',
      itemId: '',
      variantId: '',
      itemName: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      isNewItem: false,
      newItemName: '',
      newItemSellingPrice: 0,
      newItemCostPrice: 0,
      newItemCategoryId: ''
    }
  ]);

  const { data: availableItems = [] } = useItems();
  const { data: stores = [] } = useStores();
  const { data: categories = [] } = useCategories();
  const createPurchase = useCreatePurchase();

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      itemId: '',
      variantId: '',
      itemName: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      isNewItem: false,
      newItemName: '',
      newItemSellingPrice: 0,
      newItemCostPrice: 0,
      newItemCategoryId: ''
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
          const selectedItem = availableItems.find(i => i.id === value);
          updatedItem.itemName = selectedItem?.name || '';
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

  const handleFormDataChange = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => 
      (item.isNewItem && item.newItemName && item.quantity > 0 && item.unitPrice > 0) ||
      (!item.isNewItem && item.itemId && item.quantity > 0 && item.unitPrice > 0)
    );
    
    if (validItems.length === 0) {
      alert('Please add at least one valid item');
      return;
    }

    if (!formData.supplierId || !formData.storeId) {
      alert('Please select supplier and store');
      return;
    }

    const purchaseData = {
      supplier_id: formData.supplierId,
      store_id: formData.storeId,
      invoice_number: formData.invoiceNumber,
      invoice_date: formData.invoiceDate,
      date: formData.invoiceDate,
      total_cost: getTotalAmount(),
      items: validItems.map(item => {
        if (item.isNewItem) {
          return {
            new_item: {
              name: item.newItemName,
              category_id: item.newItemCategoryId,
              supplier_id: formData.supplierId,
              store_id: formData.storeId,
              cost_price: item.newItemCostPrice,
              selling_price: item.newItemSellingPrice,
              quantity_available: item.quantity
            },
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice
          };
        } else {
          return {
            item_id: item.itemId,
            variant_id: item.variantId || null,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice
          };
        }
      })
    };

    await createPurchase.mutateAsync(purchaseData);

    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      supplierId: '',
      storeId: '',
    });
    setItems([{
      id: '1',
      itemId: '',
      variantId: '',
      itemName: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      isNewItem: false,
      newItemName: '',
      newItemSellingPrice: 0,
      newItemCostPrice: 0,
      newItemCategoryId: ''
    }]);
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
          <DialogTitle className="text-cyan-300 glow-text">Create Multi-Item Purchase</DialogTitle>
        </DialogHeader>
        <Card className="border-none shadow-none">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <PurchaseFormBasicInfo
                formData={formData}
                stores={stores}
                onFormDataChange={handleFormDataChange}
              />

              <PurchaseItemsTable
                items={items}
                availableItems={availableItems}
                categories={categories}
                onAddItem={addItem}
                onUpdateItem={updateItem}
                onRemoveItem={removeItem}
                getTotalAmount={getTotalAmount}
              />

              <Button
                type="submit"
                className="w-full cyber-button text-white font-semibold"
                disabled={createPurchase.isPending || !formData.supplierId || !formData.storeId}
              >
                {createPurchase.isPending ? 'Creating Purchase...' : 'Create Purchase'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
