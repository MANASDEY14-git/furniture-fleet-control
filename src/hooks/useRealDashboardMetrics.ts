
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardMetrics } from '@/types/erp';

export const useRealDashboardMetrics = (storeId?: string) => {
  const effectiveStoreId = storeId && storeId !== 'all' ? storeId : undefined;
  return useQuery({
    queryKey: ['real-dashboard-metrics', storeId],
    queryFn: async () => {
      // Get total sales with order count using secure function
      const { data: rawSalesData, error: salesError } = await supabase.rpc('get_sales_orders_for_user', {
        _document_type: 'order',
        ...(effectiveStoreId ? { _store_id: effectiveStoreId } : {}),
      });
      
      if (salesError) throw salesError;
      
      // Filter out cancelled orders from sales
      const salesData = (rawSalesData as any[]).filter(sale => sale.delivery_status !== 'Cancelled');
      
      // Fetch sales order items for Best-Selling Products
      // Note: We'll just fetch all items and filter them in memory for simplicity, or we can use the salesData IDs
      const saleIds = salesData.map(s => s.id);
      
      let salesOrderItemsData: any[] = [];
      if (saleIds.length > 0) {
        // Fetch in batches if necessary, but for now we'll just fetch items for the filtered orders
        // Supabase stringifies arrays in 'in' filter, so we might need a simpler query or just fetch all
        const { data: itemsResult, error: itemsResultError } = await supabase
          .from('sales_order_items')
          .select('item_name, quantity, order_id');
          
        if (!itemsResultError && itemsResult) {
          salesOrderItemsData = itemsResult.filter(item => saleIds.includes(item.order_id));
        }
      }

      // Get total purchases (filtered by store if set)
      let purchaseQuery = supabase.from('purchases').select('total_cost');
      if (effectiveStoreId) purchaseQuery = purchaseQuery.eq('store_id', effectiveStoreId);
      const { data: purchasesData, error: purchasesError } = await purchaseQuery;
      
      if (purchasesError) throw purchasesError;
      
      // Get inventory metrics (filtered by store if set)
      let itemsQuery = supabase.from('items').select('id, name, quantity_available, cost_price, selling_price');
      if (effectiveStoreId) itemsQuery = itemsQuery.eq('store_id', effectiveStoreId);
      const { data: itemsData, error: itemsError } = await itemsQuery;
      
      if (itemsError) throw itemsError;
      
      // ...rest of data fetching
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('quantity_available, cost_price');
      if (materialsError) throw materialsError;
      
      const { data: outstandingData, error: outstandingError } = await supabase
        .from('sale_payment_status')
        .select('balance_due')
        .gt('balance_due', 0);
      if (outstandingError) throw outstandingError;
      
      const { data: supplierLedgerData, error: supplierLedgerError } = await supabase
        .from('supplier_ledger')
        .select('debit_amount, credit_amount');
      if (supplierLedgerError) throw supplierLedgerError;
      
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, type');
      if (paymentsError) throw paymentsError;

      // 1. Basic Metrics
      const totalSales = salesData.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const totalPurchases = purchasesData.reduce((sum, purchase) => sum + (purchase.total_cost || 0), 0);
      const grossProfit = totalSales - totalPurchases;

      // 2. Today's and Weekly Sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
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
