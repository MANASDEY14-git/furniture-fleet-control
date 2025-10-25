import React, { useState } from 'react';
import { Plus, Trash2, X, ShoppingCart, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import SupplierSelector from '@/components/SupplierSelector';
import { useItems } from '@/hooks/useItems';
import { useStores } from '@/hooks/useStores';
import { useCreateSalesOrder } from '@/hooks/useSalesOrders';
import { useEnhancedBOMByItem } from '@/hooks/useEnhancedBOM';
import { useItemVariants } from '@/hooks/useItemVariants';
import { DeliveryStatus } from '@/types';
import ProductCustomizationDialog from '@/components/sales/ProductCustomizationDialog';
import CustomizableItemIndicator from '@/components/CustomizableItemIndicator';
import CustomizableItemRow from '@/components/CustomizableItemRow';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import VariantSelector from '@/components/sales/VariantSelector';
interface ProductCustomization {
  componentId: string;
  componentName: string;
  selectedMaterialId: string;
  selectedOptionName: string;
  quantityUsed: number;
}
interface OrderItem {
  id: string;
  itemId: string;
  itemName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
  isCustomizable?: boolean;
  customizations?: ProductCustomization[];
}
interface EnhancedSalesOrderFormProps {
  trigger: React.ReactNode;
}
export default function EnhancedSalesOrderForm({
  trigger
}: EnhancedSalesOrderFormProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [isWalkInCustomer, setIsWalkInCustomer] = useState(false);
  const [formData, setFormData] = useState({
    orderNumber: '',
    storeId: '',
    supplierId: '',
    deliveryStatus: DeliveryStatus.Pending,
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    deliveryDate: '',
    advancePaid: 0,
    description: ''
  });
  const [items, setItems] = useState<OrderItem[]>([{
    id: '1',
    itemId: '',
    itemName: '',
    variantId: undefined,
    variantName: undefined,
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
    availableStock: 0,
    isCustomizable: false,
    customizations: []
  }]);
  const {
    data: availableItems = []
  } = useItems();
  const {
    data: stores = []
  } = useStores();
  const createSalesOrder = useCreateSalesOrder();
  const [customizationDialog, setCustomizationDialog] = useState({
    open: false,
    itemId: '',
    itemName: '',
    quantity: 0,
    orderItemId: ''
  });
  const filteredItems = availableItems.filter(item => {
    const matchesSupplier = isWalkInCustomer || !formData.supplierId || item.supplier_id === formData.supplierId;
    const matchesStore = !formData.storeId || item.store_id === formData.storeId;
    return matchesSupplier && matchesStore;
  });
  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      itemId: '',
      itemName: '',
      variantId: undefined,
      variantName: undefined,
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      availableStock: 0,
      isCustomizable: false,
      customizations: []
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };
  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = {
            ...item,
            [field]: value
          };
          if (field === 'itemId') {
            const selectedItem = filteredItems.find(i => i.id === value);
            updatedItem.itemName = selectedItem?.name || '';
            updatedItem.unitPrice = selectedItem?.selling_price || 0;
            updatedItem.availableStock = selectedItem?.quantity_available || 0;
            updatedItem.customizations = [];
            // Reset variant when item changes
            updatedItem.variantId = undefined;
            updatedItem.variantName = undefined;
          }
          if (field === 'variantId') {
            // When variant is selected, fetch variant details dynamically
            updatedItem.variantId = value;
          }
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      });
      return newItems;
    });
  };
  const handleCustomizationComplete = (itemId: string, customizations: ProductCustomization[]) => {
    setItems(prevItems => prevItems.map(item => item.id === itemId ? {
      ...item,
      customizations
    } : item));
  };
  const openCustomizationDialog = (item: OrderItem) => {
    if (!item.itemId || item.quantity <= 0) {
      alert('Please select an item and quantity first');
      return;
    }
    setCustomizationDialog({
      open: true,
      itemId: item.itemId,
      itemName: item.itemName,
      quantity: item.quantity,
      orderItemId: item.id
    });
  };
  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };
  const getBalanceDue = () => {
    return getTotalAmount() - formData.advancePaid;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(item => item.itemId && item.quantity > 0 && item.unitPrice > 0);
    if (validItems.length === 0) {
      alert('Please add at least one valid item');
      return;
    }
    if (!formData.orderNumber.trim()) {
      alert('Please enter an order number');
      return;
    }
    const supplierId = isWalkInCustomer ? null : formData.supplierId;
    try {
      const salesOrder = await createSalesOrder.mutateAsync({
        order_number: formData.orderNumber,
        store_id: formData.storeId,
        supplier_id: supplierId,
        delivery_status: formData.deliveryStatus,
        date: formData.date,
        customer_name: formData.customerName || null,
        customer_phone: formData.customerPhone || null,
        customer_address: formData.customerAddress || null,
        delivery_date: formData.deliveryDate || null,
        advance_paid: formData.advancePaid,
        description: formData.description || null,
        items: validItems.map(item => ({
          item_id: item.itemId,
          item_name: item.itemName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice
        }))
      });

      // Process customizations by updating material stock directly
      for (const item of validItems) {
        if (item.customizations && item.customizations.length > 0) {
          for (const custom of item.customizations) {
            // Get current material quantity
            const {
              data: material,
              error: materialError
            } = await supabase.from('materials').select('quantity_available').eq('id', custom.selectedMaterialId).single();
            if (materialError) {
              console.error('Error fetching material:', materialError);
              continue;
            }

            // Update material quantity
            const {
              error: materialUpdateError
            } = await supabase.from('materials').update({
              quantity_available: (material.quantity_available || 0) - custom.quantityUsed,
              updated_at: new Date().toISOString()
            }).eq('id', custom.selectedMaterialId);
            if (materialUpdateError) {
              console.error('Error updating material quantity:', materialUpdateError);
              continue;
            }

            // Create material stock movement record
            const {
              error: movementError
            } = await supabase.from('material_stock_movements').insert({
              material_id: custom.selectedMaterialId,
              movement_type: 'OUT',
              quantity_change: -custom.quantityUsed,
              reference_type: 'sales_order',
              reference_id: salesOrder.id,
              notes: `Used for sales order ${formData.orderNumber} - ${custom.selectedOptionName}`
            });
            if (movementError) {
              console.error('Error creating material movement record:', movementError);
            }
          }
        }
      }
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error('Error creating sales order:', error);
    }
  };
  const resetForm = () => {
    setFormData({
      orderNumber: '',
      storeId: '',
      supplierId: '',
      deliveryStatus: DeliveryStatus.Pending,
      date: new Date().toISOString().split('T')[0],
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      deliveryDate: '',
      advancePaid: 0,
      description: ''
    });
    setItems([{
      id: '1',
      itemId: '',
      itemName: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      availableStock: 0,
      isCustomizable: false,
      customizations: []
    }]);
    setIsWalkInCustomer(false);
  };
  if (isMobile) {
    // Mobile Sheet Layout
    return <Sheet open={open} onOpenChange={newOpen => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-lg mobile-sheet-content">
          <div className="flex flex-col h-full">
            {/* Mobile Header */}
            <SheetHeader className="px-6 py-4 border-b bg-background border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                  <div>
                    <SheetTitle className="text-xl font-semibold">
                      Create Sales Order
                    </SheetTitle>
                    <SheetDescription className="text-base mt-1">
                      Create a new sales order with customer details and items.
                    </SheetDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </SheetHeader>

            {/* Mobile Content */}
            <ScrollArea className="flex-1 px-6 pb-6 bg-background">
              <form onSubmit={handleSubmit} className="space-y-6 pt-6">
                {/* Basic Order Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Order Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="orderNumber" className="text-sm font-medium">Order Number *</Label>
                    <Input id="orderNumber" value={formData.orderNumber} onChange={e => setFormData({
                    ...formData,
                    orderNumber: e.target.value
                  })} required className="h-12 text-base" placeholder="Enter order number" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="store" className="text-sm font-medium">Store *</Label>
                      <select value={formData.storeId} onChange={e => setFormData({
                      ...formData,
                      storeId: e.target.value
                    })} required className="w-full h-12 px-3 rounded-md border border-input bg-background text-base">
                        <option value="">Select Store</option>
                        {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-sm font-medium">Date *</Label>
                      <Input id="date" type="date" value={formData.date} onChange={e => setFormData({
                      ...formData,
                      date: e.target.value
                    })} required className="h-12 text-base" />
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Customer Information</h3>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox id="walkInCustomer" checked={isWalkInCustomer} onCheckedChange={checked => {
                    setIsWalkInCustomer(checked as boolean);
                    if (checked) {
                      setFormData({
                        ...formData,
                        supplierId: ''
                      });
                    }
                  }} />
                    <Label htmlFor="walkInCustomer" className="text-base">Walk-in Customer</Label>
                  </div>

                  {!isWalkInCustomer && <div className="space-y-2">
                      <Label htmlFor="supplier" className="text-sm font-medium">Supplier *</Label>
                      <SupplierSelector value={formData.supplierId} onValueChange={value => setFormData({
                    ...formData,
                    supplierId: value
                  })} />
                    </div>}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName" className="text-sm font-medium">Customer Name</Label>
                      <Input id="customerName" value={formData.customerName} onChange={e => setFormData({
                      ...formData,
                      customerName: e.target.value
                    })} className="h-12 text-base" placeholder="Customer name" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="customerPhone" className="text-sm font-medium">Phone</Label>
                        <Input id="customerPhone" value={formData.customerPhone} onChange={e => setFormData({
                        ...formData,
                        customerPhone: e.target.value
                      })} className="h-12 text-base" placeholder="Phone number" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deliveryDate" className="text-sm font-medium">Delivery Date</Label>
                        <Input id="deliveryDate" type="date" value={formData.deliveryDate} onChange={e => setFormData({
                        ...formData,
                        deliveryDate: e.target.value
                      })} className="h-12 text-base" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerAddress" className="text-sm font-medium">Customer Address</Label>
                      <Textarea id="customerAddress" value={formData.customerAddress} onChange={e => setFormData({
                      ...formData,
                      customerAddress: e.target.value
                    })} className="text-base min-h-[80px]" placeholder="Full delivery address" />
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-foreground">Items</h3>
                    <Button type="button" onClick={addItem} size="sm" className="h-10">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {items.map(item => <Card key={item.id} className="p-4 bg-card border-border">
                        <div className="space-y-3">
                           <div className="space-y-2">
                             <Label className="text-sm font-medium">Item</Label>
                             <Popover>
                               <PopoverTrigger asChild>
                                 <Button
                                   variant="outline"
                                   role="combobox"
                                   className={cn(
                                     "w-full h-12 justify-between text-base",
                                     !item.itemId && "text-muted-foreground"
                                   )}
                                 >
                                   {item.itemId
                                     ? filteredItems.find((availableItem) => availableItem.id === item.itemId)?.name
                                     : "Select item..."}
                                   <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                 </Button>
                               </PopoverTrigger>
                               <PopoverContent className="w-full p-0" align="start">
                                 <Command>
                                   <CommandInput placeholder="Search items..." className="h-9" />
                                   <CommandList>
                                     <CommandEmpty>No items found.</CommandEmpty>
                                     <CommandGroup>
                                       {filteredItems.map((availableItem) => (
                                         <CommandItem
                                           key={availableItem.id}
                                           value={availableItem.name}
                                           onSelect={() => {
                                             updateItem(item.id, 'itemId', availableItem.id);
                                           }}
                                         >
                                           <Check
                                             className={cn(
                                               "mr-2 h-4 w-4",
                                               item.itemId === availableItem.id ? "opacity-100" : "opacity-0"
                                             )}
                                           />
                                           {availableItem.name} (Available: {availableItem.quantity_available})
                                         </CommandItem>
                                       ))}
                                     </CommandGroup>
                                   </CommandList>
                                 </Command>
                               </PopoverContent>
                              </Popover>
                           </div>

                           {/* Variant Selector for Mobile */}
                           {item.itemId && filteredItems.find(i => i.id === item.itemId)?.has_variants && (
                             <VariantSelector
                               itemId={item.itemId}
                               value={item.variantId}
                               onValueChange={(variantId, variantName, price, stock) => {
                                 updateItem(item.id, 'variantId', variantId);
                                 setItems(prevItems => prevItems.map(prevItem => 
                                   prevItem.id === item.id 
                                     ? { ...prevItem, variantName, unitPrice: price, availableStock: stock, totalPrice: prevItem.quantity * price }
                                     : prevItem
                                 ));
                               }}
                               className="space-y-2"
                             />
                           )}

                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Qty</Label>
                              <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} className="h-12 text-base" min="0" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Price</Label>
                              <Input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-12 text-base" min="0" step="0.01" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Total</Label>
                              <Input value={item.totalPrice.toFixed(2)} readOnly className="h-12 text-base bg-muted" />
                            </div>
                          </div>

                          {items.length > 1 && <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(item.id)} className="w-full h-10">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove Item
                            </Button>}
                        </div>
                      </Card>)}
                  </div>
                </div>

                {/* Payment Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Payment Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="advancePaid" className="text-sm font-medium">Advance Paid</Label>
                    <Input id="advancePaid" type="number" value={formData.advancePaid} onChange={e => setFormData({
                    ...formData,
                    advancePaid: parseFloat(e.target.value) || 0
                  })} className="h-12 text-base" min="0" step="0.01" placeholder="0.00" />
                  </div>

                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Amount:</span>
                      <span className="font-semibold">₹{getTotalAmount().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Advance Paid:</span>
                      <span>₹{formData.advancePaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold border-t pt-2">
                      <span>Balance Due:</span>
                      <span>₹{getBalanceDue().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="sticky bottom-0 bg-background border-t border-border pt-4 -mx-6 px-6">
                  <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={createSalesOrder.isPending}>
                    {createSalesOrder.isPending ? 'Creating Order...' : 'Create Sales Order'}
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </div>
        </SheetContent>

        {/* Customization Dialog */}
        <ProductCustomizationDialog open={customizationDialog.open} onOpenChange={open => setCustomizationDialog({
        ...customizationDialog,
        open
      })} itemId={customizationDialog.itemId} itemName={customizationDialog.itemName} quantity={customizationDialog.quantity} onCustomizationComplete={customizations => {
        handleCustomizationComplete(customizationDialog.orderItemId, customizations);
        setCustomizationDialog({
          ...customizationDialog,
          open: false
        });
      }} />
      </Sheet>;
  }

  // Desktop Dialog Layout
  return <Dialog open={open} onOpenChange={newOpen => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto futuristic-card" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">Create Sales Order</DialogTitle>
          <DialogDescription className="text-blue-300">
            Create a new sales order with customer details, items, and payment information.
          </DialogDescription>
        </DialogHeader>
        <Card className="border-none shadow-none">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber" className="text-blue-200">Order Number *</Label>
                  <Input id="orderNumber" value={formData.orderNumber} onChange={e => setFormData({
                  ...formData,
                  orderNumber: e.target.value
                })} required className="neon-border bg-slate-800/50 text-blue-100" placeholder="Enter order number" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store" className="text-blue-200">Store *</Label>
                  <select value={formData.storeId} onChange={e => setFormData({
                  ...formData,
                  storeId: e.target.value
                })} required className="w-full p-2 rounded border bg-slate-800 text-blue-100 border-blue-500/30">
                    <option value="">Select Store</option>
                    {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-blue-200">Date *</Label>
                  <Input id="date" type="date" value={formData.date} onChange={e => setFormData({
                  ...formData,
                  date: e.target.value
                })} required className="neon-border bg-slate-800/50 text-blue-100" />
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="walkInCustomer" checked={isWalkInCustomer} onCheckedChange={checked => {
                  setIsWalkInCustomer(checked as boolean);
                  if (checked) {
                    setFormData({
                      ...formData,
                      supplierId: ''
                    });
                  }
                }} />
                  <Label htmlFor="walkInCustomer" className="text-blue-200">Walk-in Customer</Label>
                </div>

                {!isWalkInCustomer && <div className="space-y-2">
                    <Label htmlFor="supplier" className="text-blue-200">Supplier *</Label>
                    <SupplierSelector value={formData.supplierId} onValueChange={value => setFormData({
                  ...formData,
                  supplierId: value
                })} />
                  </div>}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName" className="text-blue-200">Customer Name</Label>
                    <Input id="customerName" value={formData.customerName} onChange={e => setFormData({
                    ...formData,
                    customerName: e.target.value
                  })} className="neon-border bg-slate-800/50 text-blue-100" placeholder="Customer name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone" className="text-blue-200">Phone</Label>
                    <Input id="customerPhone" value={formData.customerPhone} onChange={e => setFormData({
                    ...formData,
                    customerPhone: e.target.value
                  })} className="neon-border bg-slate-800/50 text-blue-100" placeholder="Phone number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate" className="text-blue-200">Delivery Date</Label>
                    <Input id="deliveryDate" type="date" value={formData.deliveryDate} onChange={e => setFormData({
                    ...formData,
                    deliveryDate: e.target.value
                  })} className="neon-border bg-slate-800/50 text-blue-100" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerAddress" className="text-blue-200">Customer Address</Label>
                  <Textarea id="customerAddress" value={formData.customerAddress} onChange={e => setFormData({
                  ...formData,
                  customerAddress: e.target.value
                })} className="neon-border bg-slate-800/50 text-blue-100" placeholder="Full delivery address" rows={2} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-blue-200">Order Description</Label>
                  <Textarea id="description" value={formData.description} onChange={e => setFormData({
                  ...formData,
                  description: e.target.value
                })} className="neon-border bg-slate-800/50 text-blue-100 resize-none" placeholder="Enter order description or special instructions (optional)" rows={3} />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-blue-200">Items</h3>
                  <Button type="button" onClick={addItem} className="cyber-button font-semibold text-gray-950">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table className="data-grid">
                    <TableHeader>
                       <TableRow className="border-blue-500/30">
                     <TableHead className="text-blue-200">Item</TableHead>
                         <TableHead className="text-blue-200">Available</TableHead>
                         <TableHead className="text-blue-200">Quantity</TableHead>
                         <TableHead className="text-blue-200">Unit Price</TableHead>
                         <TableHead className="text-blue-200">Total</TableHead>
                         <TableHead className="text-blue-200">Customize</TableHead>
                         <TableHead className="text-blue-200">Action</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => <TableRow key={item.id} className="border-blue-500/20">
                           <TableCell>
                             <div className="space-y-2">
                               <Popover>
                                 <PopoverTrigger asChild>
                                   <Button
                                     variant="outline"
                                     role="combobox"
                                     className={cn(
                                       "w-full justify-between min-w-[200px] bg-slate-800 text-blue-100 border-blue-500/30",
                                       !item.itemId && "text-muted-foreground"
                                     )}
                                   >
                                     {item.itemId
                                       ? filteredItems.find((availableItem) => availableItem.id === item.itemId)?.name
                                       : "Select item..."}
                                     <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                   </Button>
                                 </PopoverTrigger>
                                 <PopoverContent className="w-full p-0" align="start">
                                   <Command>
                                     <CommandInput placeholder="Search items..." className="h-9" />
                                     <CommandList>
                                       <CommandEmpty>No items found.</CommandEmpty>
                                       <CommandGroup>
                                         {filteredItems.map((availableItem) => (
                                           <CommandItem
                                             key={availableItem.id}
                                             value={availableItem.name}
                                             onSelect={() => {
                                               updateItem(item.id, 'itemId', availableItem.id);
                                             }}
                                           >
                                             <Check
                                               className={cn(
                                                 "mr-2 h-4 w-4",
                                                 item.itemId === availableItem.id ? "opacity-100" : "opacity-0"
                                               )}
                                             />
                                             {availableItem.name} (Available: {availableItem.quantity_available})
                                           </CommandItem>
                                         ))}
                                       </CommandGroup>
                                     </CommandList>
                                   </Command>
                                  </PopoverContent>
                                </Popover>
                                
                                {/* Variant Selector for Desktop */}
                                {item.itemId && filteredItems.find(i => i.id === item.itemId)?.has_variants && (
                                  <VariantSelector
                                    itemId={item.itemId}
                                    value={item.variantId}
                                    onValueChange={(variantId, variantName, price, stock) => {
                                      updateItem(item.id, 'variantId', variantId);
                                      setItems(prevItems => prevItems.map(prevItem => 
                                        prevItem.id === item.id 
                                          ? { ...prevItem, variantName, unitPrice: price, availableStock: stock, totalPrice: prevItem.quantity * price }
                                          : prevItem
                                      ));
                                    }}
                                    className="space-y-1 mt-2"
                                  />
                                )}
                              </div>
                           </TableCell>
                           <TableCell className="text-blue-100">
                             {item.availableStock}
                           </TableCell>
                           <TableCell>
                             <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} className="neon-border bg-slate-800/50 text-blue-100 w-20" min="0" />
                           </TableCell>
                           <TableCell>
                             <Input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="neon-border bg-slate-800/50 text-blue-100 w-24" min="0" step="0.01" />
                           </TableCell>
                           <TableCell className="text-blue-100 font-semibold">
                             ₹{item.totalPrice.toFixed(2)}
                           </TableCell>
                           <TableCell>
                             <Button type="button" variant="outline" size="sm" onClick={() => openCustomizationDialog(item)} disabled={!item.itemId || item.quantity <= 0}>
                               Customize
                             </Button>
                           </TableCell>
                           <TableCell>
                             {items.length > 1 && <Button type="button" variant="destructive" size="sm" onClick={() => removeItem(item.id)} className="hover:bg-red-600">
                                 <Trash2 className="w-4 h-4" />
                               </Button>}
                           </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-200">Payment Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advancePaid" className="text-blue-200">Advance Paid</Label>
                    <Input id="advancePaid" type="number" value={formData.advancePaid} onChange={e => setFormData({
                    ...formData,
                    advancePaid: parseFloat(e.target.value) || 0
                  })} className="neon-border bg-slate-800/50 text-blue-100" min="0" step="0.01" placeholder="0.00" />
                  </div>
                  
                  <Card className="cyber-panel">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-blue-200">
                          <span>Total Amount:</span>
                          <span className="text-cyan-300 font-semibold">₹{getTotalAmount().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-blue-200">
                          <span>Advance Paid:</span>
                          <span>₹{formData.advancePaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-orange-300 font-semibold border-t border-blue-500/30 pt-2">
                          <span>Balance Due:</span>
                          <span>₹{getBalanceDue().toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-blue-500/30 text-blue-200 hover:bg-blue-500/10">
                  Cancel
                </Button>
                <Button type="submit" disabled={createSalesOrder.isPending} className="cyber-button font-semibold text-zinc-950">
                  {createSalesOrder.isPending ? 'Creating Order...' : 'Create Sales Order'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Customization Dialog */}
        <ProductCustomizationDialog open={customizationDialog.open} onOpenChange={open => setCustomizationDialog({
        ...customizationDialog,
        open
      })} itemId={customizationDialog.itemId} itemName={customizationDialog.itemName} quantity={customizationDialog.quantity} onCustomizationComplete={customizations => {
        handleCustomizationComplete(customizationDialog.orderItemId, customizations);
        setCustomizationDialog({
          ...customizationDialog,
          open: false
        });
      }} />
      </DialogContent>
    </Dialog>;
}