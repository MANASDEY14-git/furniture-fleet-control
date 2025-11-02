
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
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

  const { data: availableItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['purchase-available-items', formData.supplierId, formData.storeId],
    queryFn: async () => {
      console.debug('[PurchaseForm] Filters', { supplierId: formData.supplierId, storeId: formData.storeId });
      const { data, error } = await supabase.rpc('search_items_enhanced', {
        search_term: '',
        supplier_id_filter: formData.supplierId || null,
        store_id_filter: formData.storeId || null,
        show_low_stock_only: false,
        page_size: 1000,
        page_offset: 0
      });
      if (error) throw error;
      console.debug('[PurchaseForm] items count', data?.length || 0);
      return data || [];
    },
  });
  
  const createPurchase = useCreatePurchase();
  const filteredItems = availableItems;

  const handleFormDataChange = (updates: Partial<typeof formData>) => {
    // Reset item selection when supplier or store changes
    if (updates.supplierId !== undefined || updates.storeId !== undefined) {
      setFormData(prev => ({ ...prev, ...updates, itemId: '' }));
    } else {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

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
      variant_id: isNewItem ? '' : formData.variantId || undefined,
      item_name: isNewItem ? newItemData.name : filteredItems.find(i => i.id === formData.itemId)?.name || '',
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
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">Enhanced Purchase Entry</DialogTitle>
          <DialogDescription className="text-blue-300">
            Record a single item purchase from your selected supplier and store.
          </DialogDescription>
        </DialogHeader>
        <Card className="border-none shadow-none">
          <CardHeader>
            <div className="flex items-center space-x-2">
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
                onFormDataChange={handleFormDataChange}
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
                onFormDataChange={handleFormDataChange}
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
