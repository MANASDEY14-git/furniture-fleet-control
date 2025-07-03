
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useItems } from '@/hooks/useItems';
import { useCreatePurchase } from '@/hooks/usePurchases';
import PurchaseFormHeader from '@/components/purchase/PurchaseFormHeader';
import PurchaseItemSection from '@/components/purchase/PurchaseItemSection';

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
    variantId: '',
    quantity: 0,
    totalCost: 0,
  });

  const [newItemData, setNewItemData] = useState({
    name: '',
    categoryId: '',
    sellingPrice: 0,
  });

  const { data: availableItems = [] } = useItems();
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
      variantId: '',
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto futuristic-card" onInteractOutside={(e) => e.preventDefault()}>
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
              <PurchaseFormHeader
                formData={{
                  storeId: formData.storeId,
                  supplierId: formData.supplierId,
                  invoiceNumber: formData.invoiceNumber,
                  date: formData.date,
                }}
                onFormDataChange={(updates) => setFormData({ ...formData, ...updates })}
              />

              <PurchaseItemSection
                isNewItem={isNewItem}
                formData={{
                  itemId: formData.itemId,
                  variantId: formData.variantId,
                  quantity: formData.quantity,
                  totalCost: formData.totalCost,
                }}
                newItemData={newItemData}
                filteredItems={filteredItems}
                onFormDataChange={(updates) => setFormData({ ...formData, ...updates })}
                onNewItemDataChange={(updates) => setNewItemData({ ...newItemData, ...updates })}
              />

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
