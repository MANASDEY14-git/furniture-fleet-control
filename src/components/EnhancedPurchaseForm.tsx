import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCreatePurchase } from '@/hooks/usePurchases';
import PurchaseFormHeader from '@/components/purchase/PurchaseFormHeader';
import PurchaseItemSection from '@/components/purchase/PurchaseItemSection';
import BankAccountSelector from '@/components/BankAccountSelector';

interface EnhancedPurchaseFormProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function EnhancedPurchaseForm({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: EnhancedPurchaseFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [isNewItem, setIsNewItem] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [formData, setFormData] = useState({
    storeId: '',
    supplierId: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    itemId: '',
    variantId: '',
    quantity: 0,
    totalCost: 0,
    paymentMethod: 'cash' as 'cash' | 'upi' | 'bank_transfer' | 'cheque',
    bankAccountId: ''
  });
  const [newItemData, setNewItemData] = useState({
    name: '',
    categoryId: '',
    sellingPrice: 0
  });

  const {
    data: availableItems = [],
    isLoading: itemsLoading
  } = useQuery({
    queryKey: ['purchase-available-items', formData.supplierId, formData.storeId, showAllItems],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_items_enhanced', {
        search_term: '',
        supplier_id_filter: showAllItems ? null : formData.supplierId || null,
        store_id_filter: formData.storeId || null,
        show_low_stock_only: false,
        page_size: 1000,
        page_offset: 0
      });
      if (error) throw error;
      return data || [];
    }
  });

  const createPurchase = useCreatePurchase();
  const filteredItems = availableItems;

  const handleFormDataChange = (updates: Partial<typeof formData>) => {
    if (!showAllItems && (updates.supplierId !== undefined || updates.storeId !== undefined)) {
      setFormData(prev => ({ ...prev, ...updates, itemId: '', variantId: '' }));
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
        selling_price: newItemData.sellingPrice
      } : undefined
    };

    await createPurchase.mutateAsync(purchaseData);
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setFormData({
      storeId: '', supplierId: '', invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      itemId: '', variantId: '', quantity: 0, totalCost: 0,
      paymentMethod: 'cash', bankAccountId: ''
    });
    setNewItemData({ name: '', categoryId: '', sellingPrice: 0 });
    setIsNewItem(false);
  };

  const showBankAccountSelector = formData.paymentMethod !== 'cash';

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  const dialogContent = (
    <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={e => e.preventDefault()}>
      <DialogHeader>
        <DialogTitle className="text-foreground">Enhanced Purchase Entry</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Record a single item purchase from your selected supplier and store.
        </DialogDescription>
      </DialogHeader>
      <Card className="border-none shadow-none">
        <CardHeader>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch id="new-item-mode" checked={isNewItem} onCheckedChange={setIsNewItem} />
              <Label htmlFor="new-item-mode">
                Creating new item for first-time purchase
              </Label>
            </div>
            {!isNewItem && (
              <div className="flex items-center space-x-2">
                <Switch id="show-all-items" checked={showAllItems} onCheckedChange={setShowAllItems} />
                <Label htmlFor="show-all-items">
                  Show items from all suppliers
                </Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <PurchaseFormHeader
              formData={{ storeId: formData.storeId, supplierId: formData.supplierId, invoiceNumber: formData.invoiceNumber, date: formData.date }}
              onFormDataChange={handleFormDataChange}
            />

            <PurchaseItemSection
              isNewItem={isNewItem}
              formData={{ itemId: formData.itemId, variantId: formData.variantId, quantity: formData.quantity, totalCost: formData.totalCost }}
              newItemData={newItemData}
              filteredItems={filteredItems}
              onFormDataChange={handleFormDataChange}
              onNewItemDataChange={updates => setNewItemData({ ...newItemData, ...updates })}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Payment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select 
                    value={formData.paymentMethod} 
                    onValueChange={(value: 'cash' | 'upi' | 'bank_transfer' | 'cheque') => 
                      handleFormDataChange({ paymentMethod: value, bankAccountId: value === 'cash' ? '' : formData.bankAccountId })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showBankAccountSelector && (
                  <div className="space-y-2">
                    <Label>Bank Account</Label>
                    <BankAccountSelector
                      value={formData.bankAccountId}
                      onValueChange={(value) => handleFormDataChange({ bankAccountId: value })}
                      storeId={formData.storeId}
                      disabled={!formData.storeId}
                    />
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={createPurchase.isPending}
              className="w-full font-semibold"
            >
              {createPurchase.isPending ? 'Recording Purchase...' : 'Record Purchase'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </DialogContent>
  );

  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
