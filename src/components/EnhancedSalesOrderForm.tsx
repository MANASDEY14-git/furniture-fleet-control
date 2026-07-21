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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import SupplierSelector from '@/components/SupplierSelector';
import { useQuery } from '@tanstack/react-query';
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
import BankAccountSelector from '@/components/BankAccountSelector';
import CustomerSelector from '@/components/sales/CustomerSelector';
import type { Customer } from '@/hooks/useCustomers';
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
  documentType?: 'order' | 'quote';
}
export default function EnhancedSalesOrderForm({
  trigger,
  documentType = 'order'
}: EnhancedSalesOrderFormProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [isWalkInCustomer, setIsWalkInCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    orderNumber: '',
    storeId: '',
    supplierId: '',
    deliveryStatus: DeliveryStatus.Pending,
    date: new Date().toISOString().split('T')[0],
    customerId: null as string | null,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    deliveryDate: '',
    advancePaid: 0,
    description: '',
    advancePaymentMethod: 'cash' as 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'debit_card' | 'credit_card',
    advanceBankAccountId: ''
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
  const { data: availableItems = [], isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['items-search', formData.storeId, formData.supplierId, searchTerm, isWalkInCustomer],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_items_enhanced', {
        search_term: searchTerm || null,
        store_id_filter: formData.storeId || null,
        supplier_id_filter: isWalkInCustomer || !formData.supplierId ? null : formData.supplierId,
        page_size: 200,
        page_offset: 0,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!formData.storeId,
    staleTime: 0,
  });
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
    const matchesSearch = !searchTerm || (item.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSupplier && matchesStore && matchesSearch;
  });
  console.debug('[EnhancedSalesOrderForm] filters', {
    storeId: formData.storeId,
    supplierId: formData.supplierId,
    isWalkInCustomer,
    searchTerm,
    availableCount: Array.isArray(availableItems) ? availableItems.length : 0,
    filteredCount: Array.isArray(filteredItems) ? filteredItems.length : 0,
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
      // Build customizations array from all items
      const allCustomizations = validItems.flatMap(item =>
        (item.customizations || []).map(custom => ({
          item_id: item.itemId,
          bom_component_id: custom.componentId,
          selected_material_id: custom.selectedMaterialId,
          selected_option_name: custom.selectedOptionName,
          quantity_used: custom.quantityUsed,
        }))
      );

      await createSalesOrder.mutateAsync({
        order_number: formData.orderNumber,
        store_id: formData.storeId,
        supplier_id: supplierId,
        delivery_status: formData.deliveryStatus,
        date: formData.date,
        customer_id: formData.customerId || null,
        customer_name: formData.customerName || null,
        customer_phone: formData.customerPhone || null,
        customer_address: formData.customerAddress || null,
        delivery_date: formData.deliveryDate || null,
        advance_paid: documentType === 'quote' ? 0 : formData.advancePaid,
        description: formData.description || null,
        document_type: documentType,
        items: validItems.map(item => {
          const selectedItem = filteredItems.find(i => i.id === item.itemId);
          return {
            item_id: item.itemId,
            item_name: item.itemName,
            variant_id: item.variantId || null,
            supplier_id: selectedItem?.supplier_id || null,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice
          };
        }),
        customizations: allCustomizations.length > 0 ? allCustomizations : undefined
      });
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
      customerId: null,
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      deliveryDate: '',
      advancePaid: 0,
      description: '',
      advancePaymentMethod: 'cash',
      advanceBankAccountId: ''
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

  const handleCustomerSelect = (customer: Customer | null) => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone || '',
        customerAddress: customer.address || '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        customerId: null,
        customerName: '',
        customerPhone: '',
        customerAddress: '',
      }));
    }
  };

  const handleCustomerFieldChange = (field: 'customerName' | 'customerPhone' | 'customerAddress', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const showBankAccountSelector = formData.advancePaid > 0 && formData.advancePaymentMethod !== 'cash';
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
                      {documentType === 'quote' ? 'Create Quote' : 'Create Sales Order'}
                    </SheetTitle>
                    <SheetDescription className="text-base mt-1">
                      {documentType === 'quote' 
                        ? 'Quote (Not yet confirmed) — no stock or payments affected.'
                        : 'Create a new sales order with customer details and items.'}
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

                  <CustomerSelector
                    storeId={formData.storeId}
                    selectedCustomerId={formData.customerId}
                    customerName={formData.customerName}
                    customerPhone={formData.customerPhone}
                    customerAddress={formData.customerAddress}
                    onCustomerSelect={handleCustomerSelect}
                    onFieldChange={handleCustomerFieldChange}
                    inputClassName="h-12 text-base"
                    labelClassName="text-sm font-medium"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryDate" className="text-sm font-medium">Delivery Date</Label>
                      <Input id="deliveryDate" type="date" value={formData.deliveryDate} onChange={e => setFormData({
                        ...formData,
                        deliveryDate: e.target.value
                      })} className="h-12 text-base" />
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
                                    {item.itemName || "Select item..."}{item.variantName ? ` - ${item.variantName}` : ''}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                               </PopoverTrigger>
                                <PopoverContent className="w-full p-0" align="start">
                                  <Command shouldFilter={false}>
                                    <CommandInput 
                                      placeholder="Search items..." 
                                      className="h-9"
                                      value={searchTerm}
                                      onValueChange={setSearchTerm}
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        {formData.storeId && formData.supplierId 
                                          ? "No items found for this store and supplier."
                                          : formData.storeId
                                          ? "No items found for this store."
                                          : "Please select a store first."}
                                      </CommandEmpty>
                                      <CommandGroup heading={filteredItems.length > 0 ? `${filteredItems.length} items available` : undefined}>
                                        {filteredItems.map((availableItem) => (
                                          <CommandItem
                                            key={availableItem.id}
                                            value={availableItem.id}
                                            onSelect={() => {
                                              updateItem(item.id, 'itemId', availableItem.id);
                                              setSearchTerm('');
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                item.itemId === availableItem.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            {availableItem.name} (Stock: {availableItem.quantity_available})
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

                  {formData.advancePaid > 0 && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Payment Method</Label>
                        <Select 
                          value={formData.advancePaymentMethod} 
                          onValueChange={(value: typeof formData.advancePaymentMethod) => 
                            setFormData({...formData, advancePaymentMethod: value, advanceBankAccountId: value === 'cash' ? '' : formData.advanceBankAccountId})
                          }
                        >
                          <SelectTrigger className="h-12 text-base">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="upi">UPI</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="debit_card">Debit Card</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {showBankAccountSelector && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Bank Account</Label>
                          <BankAccountSelector
                            value={formData.advanceBankAccountId}
                            onValueChange={(value) => setFormData({...formData, advanceBankAccountId: value})}
                            storeId={formData.storeId}
                            disabled={!formData.storeId}
                          />
                        </div>
                      )}
                    </>
                  )}

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
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
           <DialogTitle className="text-foreground">
              {documentType === 'quote' ? 'Create Quote' : 'Create Sales Order'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {documentType === 'quote' 
                ? 'Create a new quote. Quote (Not yet confirmed) — no stock or payments will be affected.'
                : 'Create a new sales order with customer details, items, and payment information.'}
            </DialogDescription>
        </DialogHeader>
        <Card className="border-none shadow-none">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order Number *</Label>
                  <Input id="orderNumber" value={formData.orderNumber} onChange={e => setFormData({
                  ...formData,
                  orderNumber: e.target.value
                })} required placeholder="Enter order number" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store">Store *</Label>
                  <select value={formData.storeId} onChange={e => setFormData({
                  ...formData,
                  storeId: e.target.value
                })} required className="w-full p-2 rounded-xl border border-input bg-background text-foreground">
                    <option value="">Select Store</option>
                    {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input id="date" type="date" value={formData.date} onChange={e => setFormData({
                  ...formData,
                  date: e.target.value
                })} required />
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
                  <Label htmlFor="walkInCustomer">Walk-in Customer</Label>
                </div>

                {!isWalkInCustomer && <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier *</Label>
                    <SupplierSelector value={formData.supplierId} onValueChange={value => setFormData({
                  ...formData,
                  supplierId: value
                })} />
                  </div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomerSelector
                    storeId={formData.storeId}
                    selectedCustomerId={formData.customerId}
                    customerName={formData.customerName}
                    customerPhone={formData.customerPhone}
                    customerAddress={formData.customerAddress}
                    onCustomerSelect={handleCustomerSelect}
                    onFieldChange={handleCustomerFieldChange}
                    inputClassName=""
                    labelClassName=""
                  />
                  <div className="space-y-4">
                    {documentType !== 'quote' && (
                      <div className="space-y-2">
                        <Label htmlFor="deliveryDate">Delivery Date</Label>
                        <Input id="deliveryDate" type="date" value={formData.deliveryDate} onChange={e => setFormData({
                          ...formData,
                          deliveryDate: e.target.value
                        })} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{documentType === 'quote' ? 'Quote Notes' : 'Order Description'}</Label>
                  <Textarea id="description" value={formData.description} onChange={e => setFormData({
                  ...formData,
                  description: e.target.value
                })} className="resize-none" placeholder={documentType === 'quote' ? 'Enter quote notes (optional)' : 'Enter order description or special instructions (optional)'} rows={3} />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-foreground">Items</h3>
                  <Button type="button" onClick={addItem} className="font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <Table className="data-grid">
                    <TableHeader>
                       <TableRow>
                     <TableHead className="text-muted-foreground">Item</TableHead>
                         <TableHead className="text-muted-foreground">Available</TableHead>
                         <TableHead className="text-muted-foreground">Quantity</TableHead>
                         <TableHead className="text-muted-foreground">Unit Price</TableHead>
                         <TableHead className="text-muted-foreground">Total</TableHead>
                         <TableHead className="text-muted-foreground">Customize</TableHead>
                         <TableHead className="text-muted-foreground">Action</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => <TableRow key={item.id}>
                           <TableCell>
                             <div className="space-y-2">
                               <Popover>
                                 <PopoverTrigger asChild>
                                   <Button
                                     variant="outline"
                                     role="combobox"
                                     className={cn(
                                       "w-full justify-between min-w-[200px]",
                                       !item.itemId && "text-muted-foreground"
                                     )}
                                    >
                                      {item.itemName || "Select item..."}{item.variantName ? ` - ${item.variantName}` : ''}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                 </PopoverTrigger>
                                  <PopoverContent className="w-full p-0" align="start">
                                    <Command shouldFilter={false}>
                                      <CommandInput 
                                        placeholder="Search items..." 
                                        className="h-9"
                                        value={searchTerm}
                                        onValueChange={setSearchTerm}
                                      />
                                      <CommandList>
                                        <CommandEmpty>
                                          {formData.storeId && formData.supplierId 
                                            ? "No items found for this store and supplier."
                                            : formData.storeId
                                            ? "No items found for this store."
                                            : "Please select a store first."}
                                        </CommandEmpty>
                                        <CommandGroup heading={filteredItems.length > 0 ? `${filteredItems.length} items available` : undefined}>
                                          {filteredItems.map((availableItem) => (
                                            <CommandItem
                                              key={availableItem.id}
                                              value={availableItem.id}
                                              onSelect={() => {
                                                updateItem(item.id, 'itemId', availableItem.id);
                                                setSearchTerm('');
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  item.itemId === availableItem.id ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              {availableItem.name} (Stock: {availableItem.quantity_available})
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
                           <TableCell className="text-foreground">
                             {item.availableStock}
                           </TableCell>
                           <TableCell>
                             <Input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} className="w-20" min="0" />
                           </TableCell>
                           <TableCell>
                             <Input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-24" min="0" step="0.01" />
                           </TableCell>
                           <TableCell className="text-foreground font-semibold">
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

              {/* Payment Summary - hidden for quotes */}
              {documentType !== 'quote' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Payment Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advancePaid">Advance Paid</Label>
                    <Input id="advancePaid" type="number" value={formData.advancePaid} onChange={e => setFormData({
                    ...formData,
                    advancePaid: parseFloat(e.target.value) || 0
                  })} min="0" step="0.01" placeholder="0.00" />
                  </div>

                  {formData.advancePaid > 0 && (
                    <>
                      <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select 
                          value={formData.advancePaymentMethod} 
                          onValueChange={(value: typeof formData.advancePaymentMethod) => 
                            setFormData({...formData, advancePaymentMethod: value, advanceBankAccountId: value === 'cash' ? '' : formData.advanceBankAccountId})
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
                            <SelectItem value="debit_card">Debit Card</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {showBankAccountSelector && (
                        <div className="space-y-2">
                          <Label>Bank Account</Label>
                          <BankAccountSelector
                            value={formData.advanceBankAccountId}
                            onValueChange={(value) => setFormData({...formData, advanceBankAccountId: value})}
                            storeId={formData.storeId}
                            disabled={!formData.storeId}
                          />
                        </div>
                      )}
                    </>
                  )}
                  
                  <Card className="md:col-span-3 bg-muted">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-foreground">
                          <span>Total Amount:</span>
                          <span className="font-semibold">₹{getTotalAmount().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-foreground">
                          <span>Advance Paid:</span>
                          <span>₹{formData.advancePaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-amber-600 font-semibold border-t pt-2">
                          <span>Balance Due:</span>
                          <span>₹{getBalanceDue().toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              )}

              {/* Quote total summary */}
              {documentType === 'quote' && (
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <div className="flex justify-between text-foreground">
                      <span>Quote Total:</span>
                      <span className="font-semibold">₹{getTotalAmount().toFixed(2)}</span>
                    </div>
                    <p className="text-amber-600 text-sm mt-2">Quote (Not yet confirmed) — no stock or payments will be affected.</p>
                  </CardContent>
                </Card>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
               <Button type="submit" disabled={createSalesOrder.isPending} className="font-semibold">
                  {createSalesOrder.isPending 
                    ? (documentType === 'quote' ? 'Creating Quote...' : 'Creating Order...') 
                    : (documentType === 'quote' ? 'Create Quote' : 'Create Sales Order')}
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