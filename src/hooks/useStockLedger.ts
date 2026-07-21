import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StockLedgerEntry {
  date: string;
  type: 'purchase' | 'sale' | 'adjustment';
  item_name: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  reference_number?: string;
  store_id?: string;
  balance: number;
  adjustment_type?: string;
  adjustment_reason?: string;
}

export interface StockLedgerResult {
  entries: StockLedgerEntry[];
  opening_balance: number;
  closing_balance: number;
  total_purchases: number;
  total_sales: number;
}

interface UseStockLedgerParams {
  itemId?: string;
  storeId?: string;
  dateFilter: 'today' | 'week' | 'month' | 'custom';
  customDateRange?: { from: Date; to: Date } | null;
}

export const useStockLedger = ({ itemId, storeId, dateFilter, customDateRange }: UseStockLedgerParams) => {
  return useQuery({
    queryKey: ['stock-ledger', itemId, storeId, dateFilter, customDateRange],
    queryFn: async (): Promise<StockLedgerResult> => {
      // Calculate date range based on filter
      const today = new Date();
      let startDate: Date;
      let endDate: Date = today;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          break;
        case 'week':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'custom':
          if (customDateRange) {
            startDate = customDateRange.from;
            endDate = customDateRange.to;
          } else {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          }
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }

      // Calculate opening balance (transactions before start date)
      let openingBalance = 0;
      
      if (itemId && itemId !== 'all') {
        // Fetch purchases before start date
        let priorPurchaseQuery = supabase
          .from('purchases')
          .select('quantity')
          .lt('date', startDate.toISOString().split('T')[0])
          .eq('item_id', itemId);
        
        if (storeId) {
          priorPurchaseQuery = priorPurchaseQuery.eq('store_id', storeId);
        }
        
        const { data: priorPurchases } = await priorPurchaseQuery;
        const priorPurchaseQty = priorPurchases?.reduce((sum, p) => sum + p.quantity, 0) || 0;
        
        // Fetch sales before start date
        let priorSalesQuery = supabase
          .from('sales_order_items')
          .select(`
            quantity,
            sales_orders!inner (
              date,
              store_id
            )
          `)
          .eq('item_id', itemId);
        
        const { data: priorSales } = await priorSalesQuery;
        const priorSalesQty = priorSales?.filter(s => {
          const saleDate = new Date(s.sales_orders.date);
          const matchesStore = !storeId || s.sales_orders.store_id === storeId;
          return saleDate < startDate && matchesStore;
        }).reduce((sum, s) => sum + s.quantity, 0) || 0;
        
        openingBalance = priorPurchaseQty - priorSalesQty;
      }

      const stockEntries: StockLedgerEntry[] = [];

      // Fetch purchases
      let purchaseQuery = supabase
        .from('purchases')
        .select(`
          id,
          date,
          item_name,
          item_id,
          quantity,
          total_cost,
          invoice_number,
          store_id
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (itemId && itemId !== 'all') {
        purchaseQuery = purchaseQuery.eq('item_id', itemId);
      }
      if (storeId) {
        purchaseQuery = purchaseQuery.eq('store_id', storeId);
      }

      const { data: purchases, error: purchaseError } = await purchaseQuery;
      if (purchaseError) throw purchaseError;

      // Add purchases to stock entries
      purchases?.forEach(purchase => {
        const unitPrice = purchase.quantity > 0 ? purchase.total_cost / purchase.quantity : 0;
        stockEntries.push({
          date: purchase.date,
          type: 'purchase',
          item_name: purchase.item_name,
          item_id: purchase.item_id,
          quantity: purchase.quantity,
          unit_price: unitPrice,
          total_amount: purchase.total_cost,
          reference_number: purchase.invoice_number,
          store_id: purchase.store_id,
          balance: 0 // Will be calculated later
        });
      });

      // Fetch sales from sales_order_items with sales_orders
      let salesOrderItemsQuery = supabase
        .from('sales_order_items')
        .select(`
          id,
          item_name,
          item_id,
          quantity,
          unit_price,
          total_price,
          order_id,
          sales_orders!inner (
            date,
            store_id,
            order_number
          )
        `);

      const { data: salesOrderItems, error: salesError } = await salesOrderItemsQuery;
      if (salesError) throw salesError;

      // Filter and add sales to stock entries
      salesOrderItems?.forEach(saleItem => {
        const saleDate = saleItem.sales_orders.date;
        const saleStoreId = saleItem.sales_orders.store_id;
        
        // Apply date filter
        const saleDateTime = new Date(saleDate);
        if (saleDateTime < startDate || saleDateTime > endDate) {
          return;
        }

        // Apply item filter
        if (itemId && itemId !== 'all' && saleItem.item_id !== itemId) {
          return;
        }

        // Apply store filter
        if (storeId && saleStoreId !== storeId) {
          return;
        }

        stockEntries.push({
          date: saleDate,
          type: 'sale',
          item_name: saleItem.item_name,
          item_id: saleItem.item_id,
          quantity: saleItem.quantity,
          unit_price: saleItem.unit_price,
          total_amount: saleItem.total_price,
          reference_number: saleItem.sales_orders.order_number,
          store_id: saleStoreId,
          balance: 0 // Will be calculated later
        });
      });

      // Fetch stock adjustments
      let adjustmentsQuery = supabase
        .from('stock_adjustments')
        .select(`
          id,
          created_at,
          item_id,
          store_id,
          quantity_change,
          adjustment_type,
          reason,
          items!inner (
            name
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (itemId && itemId !== 'all') {
        adjustmentsQuery = adjustmentsQuery.eq('item_id', itemId);
      }
      if (storeId) {
        adjustmentsQuery = adjustmentsQuery.eq('store_id', storeId);
      }

      const { data: adjustments, error: adjustmentsError } = await adjustmentsQuery;
      if (adjustmentsError) throw adjustmentsError;

      // Add adjustments to stock entries
      adjustments?.forEach(adjustment => {
        stockEntries.push({
          date: adjustment.created_at,
          type: 'adjustment',
          item_name: adjustment.items.name,
          item_id: adjustment.item_id,
          quantity: adjustment.quantity_change,
          unit_price: 0,
          total_amount: 0,
          reference_number: `ADJ-${adjustment.adjustment_type.toUpperCase()}`,
          store_id: adjustment.store_id,
          balance: 0, // Will be calculated later
          adjustment_type: adjustment.adjustment_type,
          adjustment_reason: adjustment.reason || ''
        });
      });

      // Sort by date (oldest first) for balance calculation
      const sortedEntries = stockEntries.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate running balance
      let runningBalance = openingBalance;
      const entriesWithBalance = sortedEntries.map(entry => {
        if (entry.type === 'purchase') {
          runningBalance += entry.quantity;
        } else if (entry.type === 'sale') {
          runningBalance -= entry.quantity;
        } else if (entry.type === 'adjustment') {
          // Adjustments can be positive or negative
          runningBalance += entry.quantity;
        }
        return { ...entry, balance: runningBalance };
      });

      // Calculate totals
      const totalPurchases = stockEntries
        .filter(e => e.type === 'purchase')
        .reduce((sum, e) => sum + e.quantity, 0);
      
      const totalSales = stockEntries
        .filter(e => e.type === 'sale')
        .reduce((sum, e) => sum + e.quantity, 0);
      
      const closingBalance = openingBalance + totalPurchases - totalSales;

      // Reverse for display (newest first)
      return {
        entries: entriesWithBalance.reverse(),
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        total_purchases: totalPurchases,
        total_sales: totalSales,
      };
    },
    enabled: true
  });
};