import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Image as ImageIcon, Sparkles, TrendingUp, Clock, AlertTriangle, ShieldCheck, DollarSign, Calendar, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

interface ProductDetailDrawerProps {
  item: InventoryIntelligenceItem | null;
  onClose: () => void;
}

interface SalesHistoryItem {
  id: string;
  order_number?: string;
  order_date?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function ProductDetailDrawer({ item, onClose }: ProductDetailDrawerProps) {
  const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  useEffect(() => {
    if (!item?.id) {
      setSalesHistory([]);
      return;
    }

    async function fetchItemSales() {
      setLoadingSales(true);
      try {
        const { data, error } = await supabase
          .from('sales_order_items')
          .select('id, quantity, unit_price, total_price, sales_orders(order_number, date)')
          .eq('item_id', item.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!error && data) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            order_number: d.sales_orders?.order_number || 'N/A',
            order_date: d.sales_orders?.date || 'N/A',
            quantity: d.quantity,
            unit_price: d.unit_price,
            total_price: d.total_price,
          }));
          setSalesHistory(mapped);
        }
      } catch (err) {
        console.error('Error loading sales history:', err);
      } finally {
        setLoadingSales(false);
      }
    }

    fetchItemSales();
  }, [item?.id]);

  if (!item) return null;

  return (
    <Sheet open={Boolean(item)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto">
        <SheetHeader className="p-4 border-b bg-muted/20 space-y-2">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 rounded-lg bg-muted border overflow-hidden flex items-center justify-center flex-shrink-0">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <SheetTitle className="text-base font-bold leading-snug">{item.name}</SheetTitle>
              <SheetDescription className="text-xs flex flex-wrap items-center gap-2">
                <span>Category: <strong>{item.category_name || 'Uncategorized'}</strong></span>
                {item.brand && <span>• Brand: <strong>{item.brand}</strong></span>}
                {item.warehouse && <span>• Warehouse: <strong>{item.warehouse}</strong></span>}
              </SheetDescription>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[11px]">
                  <Sparkles className="h-3 w-3 mr-1" /> Hero Score: {item.hero_score}/100
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  Age: {item.stock_age_days}d ({item.stock_age_bucket})
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  Reorder: {item.reorder_status}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="p-4">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 w-full mb-4 text-xs">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sales">Sales History</TabsTrigger>
              <TabsTrigger value="ai">Intelligence</TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card className="border bg-card/60 p-3">
                  <span className="text-[10px] text-muted-foreground block">Available Stock</span>
                  <span className="text-lg font-bold text-foreground">{item.quantity_available} units</span>
                </Card>
                <Card className="border bg-card/60 p-3">
                  <span className="text-[10px] text-muted-foreground block">Selling Price</span>
                  <span className="text-lg font-bold text-foreground">₹{item.selling_price.toLocaleString('en-IN')}</span>
                </Card>
                <Card className="border bg-card/60 p-3">
                  <span className="text-[10px] text-muted-foreground block">Cost Price</span>
                  <span className="text-lg font-bold text-foreground">₹{item.cost_price.toLocaleString('en-IN')}</span>
                </Card>
                <Card className="border bg-card/60 p-3">
                  <span className="text-[10px] text-muted-foreground block">Inventory Value</span>
                  <span className="text-lg font-bold text-emerald-600">₹{item.inventory_value.toLocaleString('en-IN')}</span>
                </Card>
              </div>

              <div className="space-y-2 border-t pt-3">
                <h4 className="text-xs font-semibold text-foreground">Velocity & Days to Sell</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-xs">
                    <span className="text-muted-foreground block">Monthly Velocity:</span>
                    <strong className="text-foreground">{item.monthly_velocity} units / month</strong>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground block">Days to Sell Out:</span>
                    <strong className="text-foreground">{item.days_to_sell > 365 ? '&gt;365 days' : `${Math.round(item.days_to_sell)} days`}</strong>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground block">Last Sold Date:</span>
                    <strong className="text-foreground">{item.last_sold_date || 'No recent sales'}</strong>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground block">Supplier:</span>
                    <strong className="text-foreground">{item.supplier_name || 'N/A'}</strong>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: SALES HISTORY */}
            <TabsContent value="sales" className="space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Recent Sales Orders</span>
                <span className="text-[10px] text-muted-foreground">{salesHistory.length} orders found</span>
              </h4>

              {loadingSales ? (
                <div className="space-y-2">
                  <div className="h-12 bg-muted/40 animate-pulse rounded" />
                  <div className="h-12 bg-muted/40 animate-pulse rounded" />
                </div>
              ) : salesHistory.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground bg-muted/20 rounded-lg border">
                  No sales orders recorded for this item in the recent period.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {salesHistory.map((s) => (
                    <div key={s.id} className="p-2.5 rounded-lg border bg-card text-xs flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">Order #{s.order_number}</p>
                        <p className="text-[10px] text-muted-foreground">{s.order_date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">₹{s.total_price.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-muted-foreground">{s.quantity} units @ ₹{s.unit_price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: AI RECOMMENDATIONS */}
            <TabsContent value="ai" className="space-y-3">
              <Card className="border bg-gradient-to-br from-card to-card/50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                  <Sparkles className="h-4 w-4" />
                  <span>Rule-Based Decision Guidance</span>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <div className="p-2.5 rounded-md bg-muted/40 border">
                    <strong className="text-foreground block mb-0.5">Recommended Strategy:</strong>
                    <span className="text-primary font-medium">{item.recommended_action}</span>
                  </div>

                  {item.stock_age_days > 180 && (
                    <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700">
                      <strong>Cash Lock Notice:</strong> ₹{item.cash_locked.toLocaleString('en-IN')} is locked in stock older than 180 days ({item.stock_age_days} days).
                    </div>
                  )}

                  {item.reorder_status === 'Reorder Soon' && (
                    <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-700">
                      <strong>Reorder Alert:</strong> Stock coverage is below 14 days. Place purchase order with supplier immediately to avoid stockout.
                    </div>
                  )}

                  {item.hero_score >= 80 && (
                    <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
                      <strong>Hero Product Status:</strong> High margin and turnover. Maintain safety stock levels to capture maximum revenue.
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
