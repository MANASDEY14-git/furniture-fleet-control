
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardMetrics } from '@/types/erp';

import { useFinancialYear } from '@/contexts/FinancialYearContext';

export const useRealDashboardMetrics = (storeId?: string) => {
  const { selectedYear } = useFinancialYear();
  const effectiveStoreId = storeId && storeId !== 'all' ? storeId : undefined;
  
  return useQuery({
    queryKey: ['real-dashboard-metrics', storeId, selectedYear?.id],
    enabled: !!selectedYear,
    queryFn: async () => {
      if (!selectedYear) {
        return {
          totalSales: 0,
          totalPurchases: 0,
          grossProfit: 0,
          lowStockCount: 0,
          outstandingBalance: 0,
          supplierPayable: 0,
          todaysSales: 0,
          weeklySales: 0,
          deliveryDelays: 0,
          pendingOrders: 0,
          customerLifetimeValue: 0,
          repeatCustomers: 0,
          bestSellingProducts: [],
          slowMovingInventory: [],
          outOfStockCount: 0,
          totalInventoryValue: 0,
          totalMaterialValue: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          fulfillmentRate: 0,
          cashFlowRatio: 0,
          profitMargin: 0,
        };
      }

      // Get total sales with order count using secure function scoped to selected financial year
      const { data: rawSalesData, error: salesError } = await supabase.rpc('get_sales_orders_for_user', {
        _document_type: 'order',
        p_start_date: selectedYear.start_date,
        p_end_date: selectedYear.end_date,
        ...(effectiveStoreId ? { _store_id: effectiveStoreId } : {}),
      });
      
      if (salesError) throw salesError;
      
      // Filter out cancelled orders from sales
      const salesData = (rawSalesData as any[]).filter(sale => sale.delivery_status !== 'Cancelled');
      
      // Fetch sales order items for Best-Selling Products
      const saleIds = salesData.map(s => s.id);
      
      let salesOrderItemsData: any[] = [];
      if (saleIds.length > 0) {
        const { data: itemsResult, error: itemsResultError } = await supabase
          .from('sales_order_items')
          .select('item_name, quantity, order_id');
          
        if (!itemsResultError && itemsResult) {
          salesOrderItemsData = itemsResult.filter(item => saleIds.includes(item.order_id));
        }
      }

      // Get total purchases (filtered by store and scoped to selected financial year)
      let purchaseQuery = supabase.from('purchases').select('total_cost');
      if (effectiveStoreId) purchaseQuery = purchaseQuery.eq('store_id', effectiveStoreId);
      purchaseQuery = purchaseQuery
        .gte('date', selectedYear.start_date)
        .lte('date', selectedYear.end_date);
      const { data: purchasesData, error: purchasesError } = await purchaseQuery;
      
      if (purchasesError) throw purchasesError;
      
      // Get inventory metrics (filtered by store if set, fallback to snapshots if closed/past)
      let itemsData: Array<{ id: string; name: string; quantity_available: number; cost_price: number; selling_price: number }> = [];
      const isClosedOrPast = selectedYear.is_closed || !selectedYear.is_active;

      if (isClosedOrPast) {
        const { data: snapshotItems, error: snapshotError } = await supabase
          .from('year_end_snapshots')
          .select('entity_id, entity_name, closing_quantity, closing_amount, metadata')
          .eq('financial_year_id', selectedYear.id)
          .eq('snapshot_type', 'stock');
          
        if (snapshotError) throw snapshotError;
        
        itemsData = (snapshotItems || []).map(item => ({
          id: item.entity_id,
          name: item.entity_name || 'Unknown Item',
          quantity_available: Number(item.closing_quantity || 0),
          cost_price: Number((item.metadata as any)?.cost_price || 0),
          selling_price: Number((item.metadata as any)?.selling_price || 0)
        }));
      } else {
        let itemsQuery = supabase.from('items').select('id, name, quantity_available, cost_price, selling_price');
        if (effectiveStoreId) itemsQuery = itemsQuery.eq('store_id', effectiveStoreId);
        const { data: rawItems, error: itemsError } = await itemsQuery;
        
        if (itemsError) throw itemsError;
        itemsData = (rawItems || []).map(item => ({
          id: item.id,
          name: item.name,
          quantity_available: Number(item.quantity_available || 0),
          cost_price: Number(item.cost_price || 0),
          selling_price: Number(item.selling_price || 0)
        }));
      }
      
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('quantity_available, cost_price');
      if (materialsError) throw materialsError;
      
      const { data: rawOutstandingData, error: outstandingError } = await supabase
        .from('sale_payment_status')
        .select('balance_due, delivery_status, sale_date')
        .gt('balance_due', 0);
      if (outstandingError) throw outstandingError;

      const outstandingData = (rawOutstandingData || []).filter(
        item => item.delivery_status !== 'Cancelled' && 
                item.delivery_status?.toLowerCase() !== 'cancelled' &&
                item.sale_date >= selectedYear.start_date &&
                item.sale_date <= selectedYear.end_date
      );
      
      const { data: supplierLedgerData, error: supplierLedgerError } = await supabase
        .from('supplier_ledger')
        .select('debit_amount, credit_amount')
        .gte('transaction_date', selectedYear.start_date)
        .lte('transaction_date', selectedYear.end_date);
      if (supplierLedgerError) throw supplierLedgerError;
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, type')
        .gte('date', selectedYear.start_date)
        .lte('date', selectedYear.end_date);
      if (paymentsError) throw paymentsError;

      // 1. Basic Metrics
      const totalSales = salesData.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const totalPurchases = purchasesData.reduce((sum, purchase) => sum + (purchase.total_cost || 0), 0);
      const grossProfit = totalSales - totalPurchases;

      // 2. Today's and Weekly Sales (clamped or anchored to year end if closed)
      const anchorDate = isClosedOrPast ? new Date(selectedYear.end_date) : new Date();
      const today = new Date(anchorDate);
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(anchorDate);
      weekAgo.setDate(anchorDate.getDate() - 7);
      
      let todaysSales = 0;
      let weeklySales = 0;
      let pendingOrders = 0;
      let deliveryDelays = 0;

      const customerSales: Record<string, number> = {};
      const customerOrderCounts: Record<string, number> = {};

      salesData.forEach(sale => {
        const saleDate = new Date(sale.date || sale.created_at);
        saleDate.setHours(0, 0, 0, 0);
        
        if (saleDate.getTime() === today.getTime()) {
          todaysSales += (sale.total_amount || 0);
        }
        if (saleDate >= weekAgo) {
          weeklySales += (sale.total_amount || 0);
        }

        // Pending Orders (not cancelled, not delivered)
        if (sale.delivery_status === 'Pending' || (!['Delivered', 'Shipped', 'Cancelled'].includes(sale.delivery_status))) {
          pendingOrders++;
        }

        // Delivery Delays
        if (sale.delivery_date) {
          const deliveryDate = new Date(sale.delivery_date);
          deliveryDate.setHours(0, 0, 0, 0);
          if (deliveryDate < today && sale.delivery_status !== 'Delivered') {
            deliveryDelays++;
          }
        }

        // Customer calculations
        if (sale.customer_name && sale.customer_name !== '***REDACTED***' && sale.customer_name !== 'Walk-in Customer') {
          customerSales[sale.customer_name] = (customerSales[sale.customer_name] || 0) + (sale.total_amount || 0);
          customerOrderCounts[sale.customer_name] = (customerOrderCounts[sale.customer_name] || 0) + 1;
        }
      });

      // 3. Customer Lifetime Value & Repeat Customers
      const uniqueCustomers = Object.keys(customerSales).length;
      const totalCustomerRevenue = Object.values(customerSales).reduce((sum, amount) => sum + amount, 0);
      const customerLifetimeValue = uniqueCustomers > 0 ? totalCustomerRevenue / uniqueCustomers : 0;
      const repeatCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length;

      // 4. Best-Selling Products
      const productSalesMap: Record<string, number> = {};
      salesOrderItemsData.forEach(item => {
        if (item.item_name) {
          productSalesMap[item.item_name] = (productSalesMap[item.item_name] || 0) + (item.quantity || 1);
        }
      });
      const bestSellingProducts = Object.entries(productSalesMap)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5); // top 5

      // 5. Slow-Moving Inventory (High quantity available, low sales)
      const slowMovingInventory = itemsData
        .map(item => {
          const sales = productSalesMap[item.name] || 0;
          return { name: item.name, quantity_available: item.quantity_available, sales };
        })
        .filter(item => item.quantity_available > 0)
        .sort((a, b) => {
          // Sort primarily by sales (ascending), then by quantity available (descending)
          if (a.sales !== b.sales) return a.sales - b.sales;
          return b.quantity_available - a.quantity_available;
        })
        .slice(0, 5);

      // Existing Inventory metrics
      const lowStockCount = itemsData.filter(item => item.quantity_available < 5).length;
      const outOfStockCount = itemsData.filter(item => item.quantity_available === 0).length;
      const totalInventoryValue = itemsData.reduce((sum, item) => sum + (item.quantity_available * item.cost_price), 0);
      const totalMaterialValue = materialsData.reduce((sum, material) => sum + (material.quantity_available * material.cost_price), 0);
      
      const totalOrders = salesData.length;
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      const deliveredOrders = salesData.filter(order => order.delivery_status === 'Delivered').length;
      const fulfillmentRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
      
      const outstandingBalance = outstandingData.reduce((sum, item) => sum + (item.balance_due || 0), 0);
      const supplierPayable = supplierLedgerData.reduce((sum, item) => sum + (item.debit_amount || 0) - (item.credit_amount || 0), 0);
      
      const totalReceipts = paymentsData.filter(payment => payment.type === 'Receipt').reduce((sum, payment) => sum + payment.amount, 0);
      const totalPayments = paymentsData.filter(payment => payment.type === 'Payment').reduce((sum, payment) => sum + payment.amount, 0);
      const cashFlowRatio = totalPayments > 0 ? totalReceipts / totalPayments : 0;
      
      const profitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
      
      return {
        totalSales,
        totalPurchases,
        grossProfit,
        lowStockCount,
        outstandingBalance,
        supplierPayable,
        // New KPIs
        todaysSales,
        weeklySales,
        deliveryDelays,
        pendingOrders,
        customerLifetimeValue,
        repeatCustomers,
        bestSellingProducts,
        slowMovingInventory,
        // Existing enhanced metrics
        outOfStockCount,
        totalInventoryValue,
        totalMaterialValue,
        totalOrders,
        avgOrderValue,
        fulfillmentRate,
        cashFlowRatio,
        profitMargin,
        totalReceipts,
        totalPayments,
      } as DashboardMetrics & {
        outOfStockCount: number;
        totalInventoryValue: number;
        totalMaterialValue: number;
        totalOrders: number;
        avgOrderValue: number;
        fulfillmentRate: number;
        cashFlowRatio: number;
        profitMargin: number;
        totalReceipts: number;
        totalPayments: number;
      };
    },
    refetchInterval: 30000,
  });
};
