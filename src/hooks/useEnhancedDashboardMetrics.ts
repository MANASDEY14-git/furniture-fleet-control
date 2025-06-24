
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
      
      // Get sales data for the period
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          items!inner(cost_price, selling_price, name, quantity_available)
        `)
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (salesError) throw salesError;
      
      const totalSales = salesData?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;
      const totalCost = salesData?.reduce((sum, sale) => {
        const costPerItem = Number(sale.items?.cost_price || 0);
        return sum + (costPerItem * sale.quantity);
      }, 0) || 0;
      
      const totalProfit = totalSales - totalCost;
      const profitMarginPercentage = totalSales > 0 ? ((totalProfit / totalSales) * 100) : 0;
      
      // Get all sales for total calculations
      const { data: allSalesData, error: allSalesError } = await supabase
        .from('sales')
        .select(`
          *,
          items!inner(cost_price, selling_price, name, quantity_available)
        `);
      
      if (allSalesError) throw allSalesError;
      
      const allTotalSales = allSalesData?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;
      const allTotalCost = allSalesData?.reduce((sum, sale) => {
        const costPerItem = Number(sale.items?.cost_price || 0);
        return sum + (costPerItem * sale.quantity);
      }, 0) || 0;
      
      // Get purchases data
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('total_cost')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (purchasesError) throw purchasesError;
      
      const totalPurchases = purchasesData?.reduce((sum, purchase) => sum + Number(purchase.total_cost), 0) || 0;
      
      // Get inventory value
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('quantity_available, cost_price, name, selling_price');
      
      if (itemsError) throw itemsError;
      
      const totalStockValue = itemsData?.reduce((sum, item) => 
        sum + (Number(item.quantity_available) * Number(item.cost_price)), 0) || 0;
      
      // Get payments for the period
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('type', 'Receipt')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (paymentsError) throw paymentsError;
      
      const paymentsReceived = paymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
      
      // Get pending deliveries
      const { data: pendingSalesData, error: pendingSalesError } = await supabase
        .from('sales')
        .select('id')
        .eq('delivery_status', 'Pending');
      
      if (pendingSalesError) throw pendingSalesError;
      
      const pendingDeliveries = pendingSalesData?.length || 0;
      
      // Calculate top selling items
      const itemSales = allSalesData?.reduce((acc, sale) => {
        const key = sale.item_name;
        if (!acc[key]) {
          acc[key] = { name: key, quantity: 0, revenue: 0 };
        }
        acc[key].quantity += sale.quantity;
        acc[key].revenue += Number(sale.total_price);
        return acc;
      }, {} as Record<string, { name: string; quantity: number; revenue: number }>) || {};
      
      const topSellingItems = Object.values(itemSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      
      // Get low stock items (less than 10 units)
      const lowStockItems = itemsData?.filter(item => item.quantity_available < 10)
        .map(item => ({
          name: item.name,
          quantity_available: item.quantity_available,
          selling_price: Number(item.selling_price)
        }))
        .slice(0, 5) || [];
      
      // Generate sales trend data for the last 7 days
      const salesTrend = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const daySales = allSalesData?.filter(sale => sale.date === dateStr) || [];
        const dayRevenue = daySales.reduce((sum, sale) => sum + Number(sale.total_price), 0);
        const dayCosts = daySales.reduce((sum, sale) => {
          const costPerItem = Number(sale.items?.cost_price || 0);
          return sum + (costPerItem * sale.quantity);
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
  });
};
