import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardMetrics } from '@/types/erp';

export const useRealDashboardMetrics = () => {
  return useQuery({
    queryKey: ['real-dashboard-metrics'],
    queryFn: async () => {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Fetch total sales for this month
      const { data: salesData, error: salesError } = await supabase
        .from('sales_orders')
        .select('total_amount')
        .gte('created_at', startOfMonth);
      if (salesError) throw salesError;

      // Fetch total purchases for this month
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('total_cost')
        .gte('created_at', startOfMonth);
      if (purchasesError) throw purchasesError;

      // Fetch low stock items
      const { data: lowStockData, error: lowStockError } = await supabase
        .from('items')
        .select('id')
        .lt('quantity_available', 5);
      if (lowStockError) throw lowStockError;

      // Fetch customer outstanding balances
      const { data: outstandingData, error: outstandingError } = await supabase
        .from('sale_payment_status')
        .select('balance_due')
        .gt('balance_due', 0);
      if (outstandingError) throw outstandingError;

      // Fetch supplier ledger
      const { data: supplierLedgerData, error: supplierLedgerError } = await supabase
        .from('supplier_ledger')
        .select('debit_amount, credit_amount');
      if (supplierLedgerError) throw supplierLedgerError;

      // Calculate values
      const totalSales = salesData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const totalPurchases = purchasesData?.reduce((sum, p) => sum + (p.total_cost || 0), 0) || 0;
      const grossProfit = totalSales - totalPurchases;
      const lowStockCount = lowStockData?.length || 0;
      const outstandingBalance = outstandingData?.reduce((sum, s) => sum + (s.balance_due || 0), 0) || 0;
      const supplierPayable = supplierLedgerData?.reduce(
        (sum, entry) => sum + (entry.debit_amount || 0) - (entry.credit_amount || 0), 0
      ) || 0;

      // Debug logs (remove later)
      console.log('Sales this month:', totalSales);
      console.log('Purchases this month:', totalPurchases);
      console.log('Outstanding:', outstandingBalance);
      console.log('Supplier Payable:', supplierPayable);
      console.log('Low Stock Items:', lowStockCount);

      return {
        totalSales,
        totalPurchases,
        grossProfit,
        lowStockCount,
        outstandingBalance,
        supplierPayable,
      } as DashboardMetrics;
    },
    refetchInterval: 30000, // auto-refresh every 30s
  });
};
