
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EnhancedDashboardMetrics, TopSellingItem, LowStockItem } from '@/types';

export type DateFilter = 'today' | 'week' | 'month' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

const getDateRange = (filter: DateFilter, customRange?: DateRange): { startDate: string; endDate: string } => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  switch (filter) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { 
        startDate: weekStart.toISOString().split('T')[0], 
        endDate: todayStr 
      };
    case 'month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { 
        startDate: monthStart.toISOString().split('T')[0], 
        endDate: todayStr 
      };
    case 'custom':
      if (!customRange) return { startDate: todayStr, endDate: todayStr };
      return { 
        startDate: customRange.from.toISOString().split('T')[0], 
        endDate: customRange.to.toISOString().split('T')[0] 
      };
    default:
      return { startDate: todayStr, endDate: todayStr };
  }
};

export const useEnhancedDashboardMetrics = (
  dateFilter: DateFilter = 'today',
  customDateRange?: DateRange | null
) => {
  return useQuery({
    queryKey: ['enhanced-dashboard-metrics', dateFilter, customDateRange],
    queryFn: async (): Promise<EnhancedDashboardMetrics & {
      topSellingItems: TopSellingItem[];
      lowStockItems: LowStockItem[];
      salesTrend: Array<{ date: string; sales: number; profit: number }>;
    }> => {
      const { startDate, endDate } = getDateRange(dateFilter, customDateRange);
      
      // Get sales data for the period from sales_orders
      const { data: salesOrdersData, error: salesError } = await supabase
        .from('sales_orders')
        .select(`
          id,
          total_amount,
          date,
          sales_order_items (
            id,
            quantity,
            unit_price,
            total_price,
            item_name,
            item_id,
            items (
              cost_price,
              selling_price,
              name
            )
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (salesError) {
        console.error('Error fetching sales orders:', salesError);
        // Continue with empty data instead of throwing
      }
      
      const totalSales = salesOrdersData?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
      const totalCost = salesOrdersData?.reduce((orderSum, order) => {
        const orderCost = order.sales_order_items?.reduce((itemSum, item) => {
          const costPerItem = Number(item.items?.cost_price || 0);
          return itemSum + (costPerItem * (item.quantity || 0));
        }, 0) || 0;
        return orderSum + orderCost;
      }, 0) || 0;
      
      const totalProfit = totalSales - totalCost;
      const profitMarginPercentage = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;
      
      // Get all sales for total calculations from sales_orders
      const { data: allSalesOrdersData, error: allSalesError } = await supabase
        .from('sales_orders')
        .select(`
          id,
          total_amount,
          date,
          sales_order_items (
            id,
            quantity,
            unit_price,
            total_price,
            item_name,
            item_id,
            items (
              cost_price,
              selling_price,
              name
            )
          )
        `);
      
      if (allSalesError) {
        console.error('Error fetching all sales orders:', allSalesError);
        // Continue with empty data instead of throwing
      }
      
      const allTotalSales = allSalesOrdersData?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
      const allTotalCost = allSalesOrdersData?.reduce((orderSum, order) => {
        const orderCost = order.sales_order_items?.reduce((itemSum, item) => {
          const costPerItem = Number(item.items?.cost_price || 0);
          return itemSum + (costPerItem * (item.quantity || 0));
        }, 0) || 0;
        return orderSum + orderCost;
      }, 0) || 0;
      
      // Get purchases data - try multiple sources for robustness
      let totalPurchases = 0;
      
      // First try regular purchases table
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('total_cost, date')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError);
      } else {
        totalPurchases += purchasesData?.reduce((sum, purchase) => sum + Number(purchase.total_cost || 0), 0) || 0;
      }
      
      // Also try material purchases as fallback/addition
      const { data: materialPurchasesData, error: materialPurchasesError } = await supabase
        .from('material_purchases')
        .select('total_cost, date')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (materialPurchasesError) {
        console.error('Error fetching material purchases:', materialPurchasesError);
      } else {
        totalPurchases += materialPurchasesData?.reduce((sum, purchase) => sum + Number(purchase.total_cost || 0), 0) || 0;
      }
      
      // Get inventory value with error handling
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('quantity_available, cost_price, name, selling_price');
      
      if (itemsError) {
        console.error('Error fetching items:', itemsError);
      }
      
      const totalStockValue = itemsData?.reduce((sum, item) => 
        sum + (Number(item.quantity_available || 0) * Number(item.cost_price || 0)), 0) || 0;
      
      // Get payments for the period with error handling
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('type', 'Receipt')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
      }
      
      const paymentsReceived = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
      
      // Get pending deliveries from sales_orders
      const { data: pendingSalesData, error: pendingSalesError } = await supabase
        .from('sales_orders')
        .select('id')
        .eq('delivery_status', 'Pending');
      
      if (pendingSalesError) {
        console.error('Error fetching pending deliveries:', pendingSalesError);
      }
      
      const pendingDeliveries = pendingSalesData?.length || 0;
      
      // Calculate top selling items from sales_order_items
      const itemSales = allSalesOrdersData?.reduce((acc, order) => {
        order.sales_order_items?.forEach(item => {
          const key = item.item_name || 'Unknown Item';
          if (!acc[key]) {
            acc[key] = { name: key, quantity: 0, revenue: 0 };
          }
          acc[key].quantity += item.quantity || 0;
          acc[key].revenue += Number(item.total_price || 0);
        });
        return acc;
      }, {} as Record<string, { name: string; quantity: number; revenue: number }>) || {};
      
      const topSellingItems = Object.values(itemSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      
      // Get low stock items (less than 10 units for better threshold)
      const lowStockItems = itemsData?.filter(item => Number(item.quantity_available || 0) < 10)
        .map(item => ({
          name: item.name || 'Unknown Item',
          quantity_available: Number(item.quantity_available || 0),
          selling_price: Number(item.selling_price || 0)
        }))
        .slice(0, 5) || [];
      
      // Generate sales trend data for the last 7 days
      const salesTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayOrders = allSalesOrdersData?.filter(order => order.date === dateStr) || [];
        const dayRevenue = dayOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
        const dayCosts = dayOrders.reduce((orderSum, order) => {
          const orderCost = order.sales_order_items?.reduce((itemSum, item) => {
            const costPerItem = Number(item.items?.cost_price || 0);
            return itemSum + (costPerItem * (item.quantity || 0));
          }, 0) || 0;
          return orderSum + orderCost;
        }, 0);
        
        salesTrend.push({
          date: dateStr,
          sales: dayRevenue,
          profit: dayRevenue - dayCosts
        });
      }
      
      return {
        totalSalesToday: totalSales,
        totalStockValue,
        paymentsReceived,
        pendingDeliveries,
        totalProfitToday: totalProfit,
        profitMarginPercentage,
        totalSales: allTotalSales,
        totalPurchases,
        totalProfit: allTotalSales - allTotalCost,
        topSellingItems,
        lowStockItems,
        salesTrend,
      };
    },
    refetchInterval: 30000,
    staleTime: 10000, // Consider data fresh for 10 seconds
    retry: (failureCount, error) => {
      console.warn(`Dashboard metrics fetch failed (attempt ${failureCount + 1}):`, error);
      return failureCount < 2; // Retry up to 2 times
    },
  });
};
