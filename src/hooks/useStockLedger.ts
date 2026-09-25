import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StockLedgerEntry {
  date: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'transfer_out' | 'transfer_in';
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
  dateFilter: 'today' | 'week' | 'month' | 'year' | 'custom';
  customDateRange?: { from: Date; to: Date } | null;
}

import { useFinancialYear } from '@/contexts/FinancialYearContext';

export const useStockLedger = ({ itemId, storeId, dateFilter, customDateRange }: UseStockLedgerParams) => {
  const { selectedYear } = useFinancialYear();
  
  return useQuery({
    queryKey: ['stock-ledger', itemId, storeId, dateFilter, customDateRange, selectedYear?.id],
    enabled: !!selectedYear,
    queryFn: async (): Promise<StockLedgerResult> => {
      if (!selectedYear) {
        return {
          entries: [],
          opening_balance: 0,
          closing_balance: 0,
          total_purchases: 0,
          total_sales: 0
        };
      }

      const fyStartDate = new Date(selectedYear.start_date);
      const fyEndDate = new Date(selectedYear.end_date);
      const today = new Date();
      
      let startDate: Date;
      let endDate: Date = today;

      const isClosedOrPast = selectedYear.is_closed || !selectedYear.is_active;

      if (isClosedOrPast) {
        startDate = fyStartDate;
        endDate = fyEndDate;
      } else {
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
          case 'year':
            startDate = fyStartDate;
            endDate = fyEndDate;
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

        // Clamp to FY boundaries
        if (startDate < fyStartDate) startDate = fyStartDate;
        if (startDate > fyEndDate) startDate = fyEndDate;
        if (endDate < fyStartDate) endDate = fyStartDate;
        if (endDate > fyEndDate) endDate = fyEndDate;
      }

      // Calculate opening balance at the start of the view window (startDate)
      // 1. Fetch base opening balance at selectedYear.start_date from item_opening_balances
      let baseOpeningQty = 0;
      if (itemId && itemId !== 'all') {
        let obQuery = supabase
          .from('item_opening_balances')
          .select('opening_quantity')
          .eq('financial_year_id', selectedYear.id)
          .eq('item_id', itemId);
        if (storeId) {
          obQuery = obQuery.eq('store_id', storeId);
        }
        const { data: obData } = await obQuery;
        baseOpeningQty = obData?.reduce((sum, o) => sum + (o.opening_quantity || 0), 0) || 0;
      }

      // 2. Compute intermediate movements from selectedYear.start_date to startDate
      let openingBalance = baseOpeningQty;
      const startStr = selectedYear.start_date;
      const viewStartStr = startDate.toISOString().split('T')[0];

      if (viewStartStr > startStr && itemId && itemId !== 'all') {
        // Purchases between startStr and viewStartStr
        let ipQuery = supabase
          .from('purchases')
          .select('quantity')
          .gte('date', startStr)
          .lt('date', viewStartStr)
          .eq('item_id', itemId);
        if (storeId) {
          ipQuery = ipQuery.eq('store_id', storeId);
        }
        const { data: ipData } = await ipQuery;
        const intermediatePurchasesQty = ipData?.reduce((sum, p) => sum + p.quantity, 0) || 0;

        // Sales between startStr and viewStartStr
        let isQuery = supabase
          .from('sales_order_items')
          .select(`
            quantity,
            sales_orders!inner (
              date,
              store_id
            )
          `)
          .eq('item_id', itemId);
        const { data: isData } = await isQuery;
        const intermediateSalesQty = isData?.filter(s => {
          const saleDate = s.sales_orders.date;
          const matchesStore = !storeId || s.sales_orders.store_id === storeId;
          return saleDate >= startStr && saleDate < viewStartStr && matchesStore;
        }).reduce((sum, s) => sum + s.quantity, 0) || 0;

        // Adjustments between startStr and startDate
        let iaQuery = supabase
          .from('stock_adjustments')
          .select('quantity_change')
          .gte('created_at', startStr)
          .lt('created_at', startDate.toISOString())
          .eq('item_id', itemId);
        if (storeId) {
          iaQuery = iaQuery.eq('store_id', storeId);
        }
        const { data: iaData } = await iaQuery;
        const intermediateAdjustmentsQty = iaData?.reduce((sum, a) => sum + a.quantity_change, 0) || 0;

        const { data: priorTransferLines, error: priorTransferError } = await supabase
          .from('stock_transfer_lines')
          .select('source_item_id, destination_item_id, quantity_dispatched, stock_transfers!inner(dispatched_at, status)')
          .or(`source_item_id.eq.${itemId},destination_item_id.eq.${itemId}`);
        if (priorTransferError) throw priorTransferError;

        const priorTransferOut = (priorTransferLines || []).reduce((sum, line) => {
          const dispatchedAt = line.stock_transfers.dispatched_at;
          return line.source_item_id === itemId && dispatchedAt && dispatchedAt < startDate.toISOString()
            ? sum + Number(line.quantity_dispatched)
            : sum;
        }, 0);

        const { data: priorReceipts, error: priorReceiptError } = await supabase
          .from('stock_transfer_receipt_lines')
          .select('quantity_received, stock_transfer_receipts!inner(received_at), stock_transfer_lines!inner(destination_item_id)')
          .eq('stock_transfer_lines.destination_item_id', itemId)
          .lt('stock_transfer_receipts.received_at', startDate.toISOString());
        if (priorReceiptError) throw priorReceiptError;
        const priorTransferIn = (priorReceipts || []).reduce((sum, receipt) => sum + Number(receipt.quantity_received), 0);

        openingBalance = baseOpeningQty + intermediatePurchasesQty - intermediateSalesQty + intermediateAdjustmentsQty - priorTransferOut + priorTransferIn;
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

      // Transfer out is recorded when the source dispatches the batch.
      let transferOutQuery = supabase
        .from('stock_transfer_lines')
        .select('source_item_id, item_name_snapshot, quantity_dispatched, unit_transfer_price, line_value, stock_transfers!inner(source_store_id, dispatched_at, challan_number, status)')
        .not('stock_transfers.dispatched_at', 'is', null)
        .gte('stock_transfers.dispatched_at', startDate.toISOString())
        .lte('stock_transfers.dispatched_at', endDate.toISOString());
      if (itemId && itemId !== 'all') transferOutQuery = transferOutQuery.eq('source_item_id', itemId);
      if (storeId) transferOutQuery = transferOutQuery.eq('stock_transfers.source_store_id', storeId);
      const { data: transferOutLines, error: transferOutError } = await transferOutQuery;
      if (transferOutError) throw transferOutError;
      transferOutLines?.forEach((line) => {
        if (!line.stock_transfers.dispatched_at) return;
        stockEntries.push({
          date: line.stock_transfers.dispatched_at,
          type: 'transfer_out',
          item_name: line.item_name_snapshot,
          item_id: line.source_item_id,
          quantity: Number(line.quantity_dispatched),
          unit_price: Number(line.unit_transfer_price),
          total_amount: Number(line.line_value),
          reference_number: line.stock_transfers.challan_number || undefined,
          store_id: line.stock_transfers.source_store_id,
          balance: 0,
          adjustment_type: ['in_transit', 'partially_received'].includes(line.stock_transfers.status) ? 'in_transit' : 'transfer_out',
        });
      });

      // Transfer in is recorded only for quantities accepted at the destination.
      let transferInQuery = supabase
        .from('stock_transfer_receipt_lines')
        .select('quantity_received, stock_transfer_receipts!inner(received_at, receipt_number), stock_transfer_lines!inner(destination_item_id, item_name_snapshot, unit_transfer_price, transfer_id, stock_transfers!inner(destination_store_id, challan_number))')
        .gte('stock_transfer_receipts.received_at', startDate.toISOString())
        .lte('stock_transfer_receipts.received_at', endDate.toISOString());
      if (itemId && itemId !== 'all') transferInQuery = transferInQuery.eq('stock_transfer_lines.destination_item_id', itemId);
      if (storeId) transferInQuery = transferInQuery.eq('stock_transfer_lines.stock_transfers.destination_store_id', storeId);
      const { data: transferInLines, error: transferInError } = await transferInQuery;
      if (transferInError) throw transferInError;
      transferInLines?.forEach((receipt) => {
        const line = receipt.stock_transfer_lines;
        stockEntries.push({
          date: receipt.stock_transfer_receipts.received_at,
          type: 'transfer_in',
          item_name: line.item_name_snapshot,
          item_id: line.destination_item_id,
          quantity: Number(receipt.quantity_received),
          unit_price: Number(line.unit_transfer_price),
          total_amount: Number(receipt.quantity_received) * Number(line.unit_transfer_price),
          reference_number: line.stock_transfers.challan_number || receipt.stock_transfer_receipts.receipt_number,
          store_id: line.stock_transfers.destination_store_id,
          balance: 0,
        });
      });

      // Sort by date (oldest first) for balance calculation
      const sortedEntries = stockEntries.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate running balance
      let runningBalance = openingBalance;
      const entriesWithBalance = sortedEntries.map(entry => {
        if (entry.type === 'purchase' || entry.type === 'transfer_in') {
          runningBalance += entry.quantity;
        } else if (entry.type === 'sale' || entry.type === 'transfer_out') {
          runningBalance -= entry.quantity;
        } else if (entry.type === 'adjustment') {
          // Adjustments can be positive or negative
          runningBalance += entry.quantity;
        }
        return { ...entry, balance: runningBalance };
      });

      // Calculate totals
      const totalPurchases = stockEntries
        .filter(e => e.type === 'purchase' || e.type === 'transfer_in' || (e.type === 'adjustment' && e.quantity > 0))
        .reduce((sum, e) => sum + e.quantity, 0);
      
      const totalSales = stockEntries
        .filter(e => e.type === 'sale' || e.type === 'transfer_out' || (e.type === 'adjustment' && e.quantity < 0))
        .reduce((sum, e) => sum + Math.abs(e.quantity), 0);
      
      const closingBalance = entriesWithBalance.length > 0 ? runningBalance : openingBalance;

      // Reverse for display (newest first)
      return {
        entries: entriesWithBalance.reverse(),
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        total_purchases: totalPurchases,
        total_sales: totalSales,
      };
    }
  });
};