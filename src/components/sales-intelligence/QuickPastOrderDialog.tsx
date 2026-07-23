import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Users, Sparkles, ShoppingBag, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateSalesOrder } from '@/hooks/useSalesOrders';
import { useStores } from '@/hooks/useStores';
import { supabase } from '@/integrations/supabase/client';

interface QuickPastOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccessRefresh?: () => void;
}

export function QuickPastOrderDialog({ open, onOpenChange, onSuccessRefresh }: QuickPastOrderDialogProps) {
  const { data: stores = [] } = useStores();
  const createSalesOrder = useCreateSalesOrder();

  const [date, setDate] = useState<string>('2026-05-15');
  const [storeId, setStoreId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [category, setCategory] = useState<string>('Sofa');
  const [itemName, setItemName] = useState<string>('Italian Leather 3-Seater Sofa');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(85000);
  const [discountPct, setDiscountPct] = useState<number>(5);
  const [salespeople, setSalespeople] = useState<string>('Rahul Sharma, Amit Verma');

  useEffect(() => {
    if (stores.length > 0 && !storeId) {
      setStoreId(stores[0].id);
    }
  }, [stores, storeId]);

  const categories = ['Sofa', 'Dining', 'Wardrobe', 'Bed', 'Office Furniture', 'Mattress', 'Chairs', 'Storage'];

  const handleSavePastOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId && stores.length > 0) {
      toast.error('Please select a store/branch');
      return;
    }

    try {
      const selectedStore = storeId || (stores[0]?.id);
      if (!selectedStore) {
        toast.error('No store available');
        return;
      }

      const { data, error } = await supabase.rpc('import_past_sales_order', {
        _order_date: date,
        _order_number: `SO-HIST-${Date.now().toString().slice(-4)}`,
        _customer_name: customerName || 'Historical Walk-in Client',
        _category_name: category,
        _item_name: itemName,
        _quantity: quantity,
        _unit_price: unitPrice,
        _cost_price: Math.round(unitPrice * 0.6), // default cost price to 60% of unit price
        _discount_pct: discountPct,
        _salespeople: salespeople,
        _store_id: selectedStore
      });

      if (error) throw error;

      toast.success(`Past order logged for ${date}! (Sales split 50-50 for ${salespeople})`);
      onOpenChange(false);
      if (onSuccessRefresh) onSuccessRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to record past order: ${err.message || err}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 space-y-4">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Enter Historical Past Order Data
          </DialogTitle>
          <DialogDescription className="text-xs">
            Log past sales orders to populate historical monthly trends, salesperson performance, and aged stock clearance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSavePastOrder} className="space-y-4 text-xs">
          {/* Order Date & Store */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-semibold">Order Date (Past Month/Year) *</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Branch / Store *</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger className="h-9 text-xs border-border/60">
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Customer & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-semibold">Customer Name</Label>
              <Input
                placeholder="e.g. Verma Villa / Corporate Client"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Product Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-xs border-border/60">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Item Name & Quantity */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="font-semibold">Item Name / Description</Label>
              <Input
                placeholder="e.g. Chesterfield 3-Seater Sofa"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Price & Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-semibold">Unit Price (₹)</Label>
              <Input
                type="number"
                value={unitPrice}
                onChange={e => setUnitPrice(Number(e.target.value))}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold">Discount (%)</Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={discountPct}
                onChange={e => setDiscountPct(Number(e.target.value))}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Attended Salespeople with 50-50 Split Rule */}
          <div className="space-y-1.5 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-purple-500" /> Attended Salesperson(s) (50-50 Split Rule)
              </Label>
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600">
                50-50 Split Supported
              </Badge>
            </div>
            <Input
              placeholder="e.g. Rahul Sharma, Amit Verma (comma separated for 2 reps)"
              value={salespeople}
              onChange={e => setSalespeople(e.target.value)}
              className="h-9 text-xs"
            />
            {salespeople.includes(',') && (
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                ⚡ Co-attended sale detected: Revenue, profit & commission will be split 50-50 between {salespeople}.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="submit" className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              <Plus className="h-3.5 w-3.5 mr-1" /> Save Past Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
