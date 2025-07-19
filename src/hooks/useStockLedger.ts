import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StockLedgerEntry {
  date: string;
  type: 'purchase' | 'sale';
  item_name: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  reference_number?: string;
  store_id?: string;
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
    queryFn: async (): Promise<StockLedgerEntry[]> => {
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

      if (itemId) {
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
          store_id: purchase.store_id
        });
      });

      // Fetch sales
      let salesQuery = supabase
        .from('sales')
        .select(`
          id,
          date,
          item_name,
          item_id,
          quantity,
          total_price,
          store_id
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (itemId) {
        salesQuery = salesQuery.eq('item_id', itemId);
      }
      if (storeId) {
        salesQuery = salesQuery.eq('store_id', storeId);
      }

      const { data: sales, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      // Add sales to stock entries
      sales?.forEach(sale => {
        const unitPrice = sale.quantity > 0 ? sale.total_price / sale.quantity : 0;
        stockEntries.push({
          date: sale.date,
          type: 'sale',
          item_name: sale.item_name,
          item_id: sale.item_id,
          quantity: sale.quantity,
          unit_price: unitPrice,
          total_amount: sale.total_price,
          store_id: sale.store_id
        });
      });

      // Sort by date (newest first)
      return stockEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: true
  });
};