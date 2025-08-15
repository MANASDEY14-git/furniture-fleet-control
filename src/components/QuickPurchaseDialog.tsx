import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStores } from '@/hooks/useStores';
import { useItems } from '@/hooks/useItems';
import { useMaterials } from '@/hooks/useMaterials';
import { useCreatePurchase } from '@/hooks/usePurchases';
import { useCreateMaterialPurchase } from '@/hooks/useMaterialPurchases';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface QuickPurchaseDialogProps {
  supplier: any;
  trigger: React.ReactNode;
}

interface PurchaseItem {
  id: string;
  type: 'item' | 'material';
  item_id?: string;
  material_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export default function QuickPurchaseDialog({ supplier, trigger }: QuickPurchaseDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [storeId, setStoreId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
    { id: '1', type: 'item', name: '', quantity: 1, unit_price: 0 }
  ]);

  const { data: stores = [] } = useStores();
  const { data: items = [] } = useItems();
  const { data: materials = [] } = useMaterials();
  const createPurchase = useCreatePurchase();
  const createMaterialPurchase = useCreateMaterialPurchase();
  const { toast } = useToast();

  // Debug logging
  console.log('QuickPurchaseDialog - Data status:', {
    storesCount: stores.length,
    itemsCount: items.length, 
    materialsCount: materials.length,
    storeId,
    purchaseItems: purchaseItems.map(item => ({
      id: item.id,
      type: item.type,
      name: item.name,
      item_id: item.item_id,
      material_id: item.material_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }))
  });

  const addPurchaseItem = () => {
    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      type: 'item',
      name: '',
      quantity: 1,
      unit_price: 0
    };
    setPurchaseItems([...purchaseItems, newItem]);
  };

  const removePurchaseItem = (id: string) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter(item => item.id !== id));
    }
  };

  const updatePurchaseItem = (id: string, field: keyof PurchaseItem, value: any) => {
    setPurchaseItems(purchaseItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleTypeChange = (id: string, newType: 'item' | 'material') => {
    setPurchaseItems(purchaseItems.map(item => 
      item.id === id ? {
        ...item,
        type: newType,
        name: '',
        item_id: undefined,
        material_id: undefined,
        unit_price: 0
      } : item
    ));
  };

  const handleItemSelection = (id: string, selectedId: string, type: 'item' | 'material') => {
    let selectedItem;
    if (type === 'item') {
      selectedItem = items.find(i => i.id === selectedId);
    } else {
      selectedItem = materials.find(m => m.id === selectedId);
    }

    if (selectedItem) {
      updatePurchaseItem(id, 'type', type);
      updatePurchaseItem(id, type === 'item' ? 'item_id' : 'material_id', selectedId);
      updatePurchaseItem(id, 'name', selectedItem.name);
      updatePurchaseItem(id, 'unit_price', selectedItem.cost_price || 0);
    }
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // More specific validation with better error messages
    if (!storeId) {
      toast({
        title: "Validation Error",
        description: "Please select a store",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Validation Error", 
        description: "Please select a purchase date",
        variant: "destructive",
      });
      return;
    }

    // Validate each purchase item with improved logic
    const invalidItems = purchaseItems.filter(item => {
      const hasValidSelection = (item.type === 'item' && item.item_id) || (item.type === 'material' && item.material_id);
      const isValidItem = item.name && hasValidSelection && item.quantity > 0 && item.unit_price >= 0;
      
      console.log('Validation check for item:', {
        id: item.id,
        type: item.type,
        name: item.name,
        item_id: item.item_id,
        material_id: item.material_id,
        hasValidSelection,
        quantity: item.quantity,
        unit_price: item.unit_price,
        isValidItem
      });
      
      return !isValidItem;
    });

    if (invalidItems.length > 0) {
      console.log('Invalid items found:', invalidItems);
      const firstInvalidItem = invalidItems[0];
      let errorMessage = "Please check the following:";
      
      if (!firstInvalidItem.name || (!firstInvalidItem.item_id && !firstInvalidItem.material_id)) {
        errorMessage += " Select an item/material.";
      }
      if (firstInvalidItem.quantity <= 0) {
        errorMessage += " Enter a positive quantity.";
      }
      if (firstInvalidItem.unit_price < 0) {
        errorMessage += " Enter a valid unit price.";
      }
      
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Process items and materials separately
      const itemPurchases = purchaseItems.filter(item => item.type === 'item' && item.item_id);
      const materialPurchases = purchaseItems.filter(item => item.type === 'material' && item.material_id);

      // Create item purchases
      for (const itemPurchase of itemPurchases) {
        await createPurchase.mutateAsync({
          supplier_id: supplier.id,
          store_id: storeId,
          date: dateStr,
          invoice_number: invoiceNumber,
          item_id: itemPurchase.item_id!,
          item_name: itemPurchase.name,
          quantity: itemPurchase.quantity,
          total_cost: itemPurchase.quantity * itemPurchase.unit_price
        });
      }

      // Create material purchases
      for (const materialItem of materialPurchases) {
        await createMaterialPurchase.mutateAsync({
          material_id: materialItem.material_id!,
          supplier_id: supplier.id,
          store_id: storeId,
          date: dateStr,
          invoice_number: invoiceNumber,
          quantity: materialItem.quantity,
          unit_cost: materialItem.unit_price,
          total_cost: materialItem.quantity * materialItem.unit_price
        });
      }

      toast({
        title: "Success",
        description: "Purchase recorded successfully",
      });

      // Reset form
      setStoreId('');
      setInvoiceNumber('');
      setPurchaseItems([{ id: '1', type: 'item', name: '', quantity: 1, unit_price: 0 }]);
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record purchase",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">
            Quick Purchase - {supplier.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-blue-200">Purchase Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal neon-border bg-slate-800/50 text-blue-100",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
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
              <Label htmlFor="invoiceNumber" className="text-blue-200">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                placeholder="Enter invoice number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="neon-border bg-slate-800/50 text-blue-100"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-cyan-300">Purchase Items</h3>
              <Button
                type="button"
                onClick={addPurchaseItem}
                className="cyber-button text-white"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            {purchaseItems.map((item, index) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 rounded-lg border border-blue-500/30 bg-slate-800/30">
                <div className="space-y-2">
                  <Label className="text-blue-200">Type</Label>
                  <Select 
                    value={item.type} 
                    onValueChange={(value: 'item' | 'material') => handleTypeChange(item.id, value)}
                  >
                    <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-blue-500/30">
                      <SelectItem value="item" className="text-blue-100 focus:bg-blue-800/30">Item</SelectItem>
                      <SelectItem value="material" className="text-blue-100 focus:bg-blue-800/30">Material</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-blue-200">{item.type === 'item' ? 'Item' : 'Material'}</Label>
                  <Select 
                    value={item.type === 'item' ? item.item_id : item.material_id} 
                    onValueChange={(value) => handleItemSelection(item.id, value, item.type)}
                  >
                    <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                      <SelectValue placeholder={`Select ${item.type}`} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-blue-500/30">
                      {(item.type === 'item' ? items : materials).map((option) => (
                        <SelectItem key={option.id} value={option.id} className="text-blue-100 focus:bg-blue-800/30">
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-blue-200">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) => updatePurchaseItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-blue-200">Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updatePurchaseItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                </div>

                <div className="flex items-end">
                  {purchaseItems.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePurchaseItem(item.id)}
                      className="neon-border bg-slate-800/50 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-blue-200">Total Amount:</p>
                <p className="text-2xl font-bold text-cyan-300">
                  ₹{calculateTotal().toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 neon-border bg-slate-800/50 text-blue-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPurchase.isPending || createMaterialPurchase.isPending}
              className="flex-1 cyber-button text-white"
            >
              {(createPurchase.isPending || createMaterialPurchase.isPending) ? 'Recording...' : 'Record Purchase'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}