
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EnhancedDashboardMetrics, TopSellingItem, LowStockItem } from '@/types';

export type DateFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

const getDateRange = (
  filter: DateFilter,
  customRange?: DateRange,
  yearRange?: { start: string; end: string }
): { startDate: string; endDate: string } => {
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
    case 'year':
      if (!yearRange) return { startDate: todayStr, endDate: todayStr };
      return { startDate: yearRange.start, endDate: yearRange.end };
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

import { useFinancialYear } from '@/contexts/FinancialYearContext';

export const useEnhancedDashboardMetrics = (
  dateFilter: DateFilter = 'today',
  customDateRange?: DateRange | null
) => {
  const { selectedYear } = useFinancialYear();
  
  return useQuery({
    queryKey: ['enhanced-dashboard-metrics', dateFilter, customDateRange, selectedYear?.id],
    enabled: !!selectedYear,
    queryFn: async (): Promise<EnhancedDashboardMetrics & {
      topSellingItems: TopSellingItem[];
      lowStockItems: LowStockItem[];
      salesTrend: Array<{ date: string; sales: number; profit: number }>;
    }> => {
      if (!selectedYear) {
        return {
          totalSalesToday: 0,
          totalStockValue: 0,
          paymentsReceived: 0,
          pendingDeliveries: 0,
          totalProfitToday: 0,
          profitMarginPercentage: 0,
          totalSales: 0,
          totalPurchases: 0,
          totalProfit: 0,
          topSellingItems: [],
          lowStockItems: [],
          salesTrend: [],
        };
      }

      const { startDate, endDate } = getDateRange(dateFilter, customDateRange);
      
      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;
      
      const isClosedOrPast = selectedYear.is_closed || !selectedYear.is_active;
      
      if (isClosedOrPast) {
        effectiveStartDate = selectedYear.start_date;
        effectiveEndDate = selectedYear.end_date;
      } else {
        if (effectiveStartDate < selectedYear.start_date) effectiveStartDate = selectedYear.start_date;
        if (effectiveStartDate > selectedYear.end_date) effectiveStartDate = selectedYear.end_date;
        if (effectiveEndDate < selectedYear.start_date) effectiveEndDate = selectedYear.start_date;
        if (effectiveEndDate > selectedYear.end_date) effectiveEndDate = selectedYear.end_date;
      }
      
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
        .gte('date', effectiveStartDate)
        .lte('date', effectiveEndDate);
      
      if (salesError) {
        console.error('Error fetching sales orders:', salesError);
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
      
      // Get all sales for total calculations from sales_orders (scoped to the financial year)
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
        `)
        .gte('date', selectedYear.start_date)
        .lte('date', selectedYear.end_date);
      
      if (allSalesError) {
        console.error('Error fetching all sales orders:', allSalesError);
      }
      
      const allTotalSales = allSalesOrdersData?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
      const allTotalCost = allSalesOrdersData?.reduce((orderSum, order) => {
        const orderCost = order.sales_order_items?.reduce((itemSum, item) => {
          const costPerItem = Number(item.items?.cost_price || 0);
          return itemSum + (costPerItem * (item.quantity || 0));
        }, 0) || 0;
        return orderSum + orderCost;
      }, 0) || 0;
      
      // Get purchases data scoped to date range
      let totalPurchases = 0;
      
      // First try regular purchases table
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('total_cost, date')
        .gte('date', effectiveStartDate)
        .lte('date', effectiveEndDate);
      
      if (purchasesError) {
        console.error('Error fetching purchases:', purchasesError);
      } else {
        totalPurchases += purchasesData?.reduce((sum, purchase) => sum + Number(purchase.total_cost || 0), 0) || 0;
      }
      
      // Also try material purchases
      const { data: materialPurchasesData, error: materialPurchasesError } = await supabase
        .from('material_purchases')
        .select('total_cost, date')
        .gte('date', effectiveStartDate)
        .lte('date', effectiveEndDate);
      
      if (materialPurchasesError) {
        console.error('Error fetching material purchases:', materialPurchasesError);
      } else {
        totalPurchases += materialPurchasesData?.reduce((sum, purchase) => sum + Number(purchase.total_cost || 0), 0) || 0;
      }
      
      // Get inventory value - Fallback to snapshots if closed/past year
      let totalStockValue = 0;
      let itemsForLowStock: Array<{ name: string; quantity_available: number; selling_price: number }> = [];
      
      if (isClosedOrPast) {
        const { data: snapshotItems, error: snapshotError } = await supabase
          .from('year_end_snapshots')
          .select('closing_quantity, closing_amount, entity_name, metadata')
          .eq('financial_year_id', selectedYear.id)
          .eq('snapshot_type', 'stock');
          
        if (snapshotError) {
          console.error('Error fetching snapshot stock:', snapshotError);
        } else {
          totalStockValue = snapshotItems?.reduce((sum, item) => sum + Number(item.closing_amount || 0), 0) || 0;
          itemsForLowStock = (snapshotItems || []).map(item => ({
            name: item.entity_name || 'Unknown Item',
            quantity_available: Number(item.closing_quantity || 0),
            selling_price: Number((item.metadata as any)?.selling_price || 0)
          }));
        }
      } else {
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('quantity_available, cost_price, name, selling_price');
        
        if (itemsError) {
          console.error('Error fetching items:', itemsError);
        } else {
          totalStockValue = itemsData?.reduce((sum, item) => 
            sum + (Number(item.quantity_available || 0) * Number(item.cost_price || 0)), 0) || 0;
          itemsForLowStock = (itemsData || []).map(item => ({
            name: item.name || 'Unknown Item',
            quantity_available: Number(item.quantity_available || 0),
            selling_price: Number(item.selling_price || 0)
          }));
        }
      }
      
      // Get payments for the period
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('type', 'Receipt')
        .gte('date', effectiveStartDate)
        .lte('date', effectiveEndDate);
      
      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
      }
      
      const paymentsReceived = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
      
      // Get pending deliveries from sales_orders (only relevant for active year)
      let pendingDeliveries = 0;
      if (!isClosedOrPast) {
        const { data: pendingSalesData, error: pendingSalesError } = await supabase
          .from('sales_orders')
          .select('id')
          .eq('delivery_status', 'Pending')
          .gte('date', selectedYear.start_date)
          .lte('date', selectedYear.end_date);
        
        if (pendingSalesError) {
          console.error('Error fetching pending deliveries:', pendingSalesError);
        } else {
          pendingDeliveries = pendingSalesData?.length || 0;
        }
      }
      
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
      
      // Get low stock items
      const lowStockItems = itemsForLowStock.filter(item => Number(item.quantity_available || 0) < 10)
        .slice(0, 5);
      
      // Generate sales trend data for the last 7 days of the period
      const salesTrend = [];
      const trendEndDate = isClosedOrPast ? new Date(selectedYear.end_date) : new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(trendEndDate);
        date.setDate(trendEndDate.getDate() - i);
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
    staleTime: 10000,
    retry: (failureCount, error) => {
      console.warn(`Dashboard metrics fetch failed (attempt ${failureCount + 1}):`, error);
      return failureCount < 2;
    },
  });
};
