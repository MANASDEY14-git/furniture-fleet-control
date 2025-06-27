
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardMetrics } from '@/types/erp';

export const useRealDashboardMetrics = () => {
  return useQuery({
    queryKey: ['real-dashboard-metrics'],
    queryFn: async () => {
      // Get total sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales_orders')
        .select('total_amount');
      
      if (salesError) throw salesError;
      
      // Get total purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('total_cost');
      
      if (purchasesError) throw purchasesError;
      
      // Get low stock items (quantity < 5)
      const { data: lowStockData, error: lowStockError } = await supabase
        .from('items')
        .select('id')
        .lt('quantity_available', 5);
      
      if (lowStockError) throw lowStockError;
      
      // Get outstanding balance from customers
      const { data: outstandingData, error: outstandingError } = await supabase
        .from('sale_payment_status')
        .select('balance_due')
        .gt('balance_due', 0);
      
      if (outstandingError) throw outstandingError;
      
      // Get supplier payable (sum of debit amounts minus credit amounts)
      const { data: supplierLedgerData, error: supplierLedgerError } = await supabase
        .from('supplier_ledger')
        .select('debit_amount, credit_amount');
      
      if (supplierLedgerError) throw supplierLedgerError;
      
      const totalSales = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
      const totalPurchases = purchasesData.reduce((sum, purchase) => sum + (purchase.total_cost || 0), 0);
      const grossProfit = totalSales - totalPurchases;
      const lowStockCount = lowStockData.length;
      const outstandingBalance = outstandingData.reduce((sum, item) => sum + (item.balance_due || 0), 0);
      const supplierPayable = supplierLedgerData.reduce((sum, item) => 
        sum + (item.debit_amount || 0) - (item.credit_amount || 0), 0);
      
      return {
        totalSales,
        totalPurchases,
        grossProfit,
        lowStockCount,
        outstandingBalance,
        supplierPayable,
      } as DashboardMetrics;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
