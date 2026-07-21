
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardMetrics } from '@/types/erp';

export const useRealDashboardMetrics = () => {
  return useQuery({
    queryKey: ['real-dashboard-metrics'],
    queryFn: async () => {
      // Get total sales with order count using secure function
      const { data: salesData, error: salesError } = await supabase.rpc('get_sales_orders_for_user', { _document_type: 'order' });
      
      if (salesError) throw salesError;
      
      // Get total purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('total_cost');
      
      if (purchasesError) throw purchasesError;
      
      // Get inventory metrics
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('id, quantity_available, cost_price, selling_price');
      
      if (itemsError) throw itemsError;
      
      // Get materials for stock value calculation
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('quantity_available, cost_price');
      
      if (materialsError) throw materialsError;
      
      // Get outstanding balance from customers
      const { data: outstandingData, error: outstandingError } = await supabase
        .from('sale_payment_status')
        .select('balance_due')
        .gt('balance_due', 0);
      
      if (outstandingError) throw outstandingError;
      
      // Get supplier payable
      const { data: supplierLedgerData, error: supplierLedgerError } = await supabase
        .from('supplier_ledger')
        .select('debit_amount, credit_amount');
      
      if (supplierLedgerError) throw supplierLedgerError;
      
      // Get delivery status for fulfillment rate (use same secure data)
      const deliveryData = salesData;
      
      // Get payment metrics
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, type');
      
      if (paymentsError) throw paymentsError;
      
      // Calculate basic metrics
      const totalSales = (salesData as any[]).reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const totalPurchases = purchasesData.reduce((sum, purchase) => sum + (purchase.total_cost || 0), 0);
      const grossProfit = (totalSales as number) - totalPurchases;
      
      // Calculate inventory metrics
      const lowStockCount = itemsData.filter(item => item.quantity_available < 5).length;
      const outOfStockCount = itemsData.filter(item => item.quantity_available === 0).length;
      const totalInventoryValue = itemsData.reduce((sum, item) => 
        sum + (item.quantity_available * item.cost_price), 0);
      const totalMaterialValue = materialsData.reduce((sum, material) => 
        sum + (material.quantity_available * material.cost_price), 0);
      
      // Calculate order metrics
      const totalOrders = salesData.length;
      const avgOrderValue = totalOrders > 0 ? (totalSales as number) / totalOrders : 0;
      
      // Calculate fulfillment rate
      const deliveredOrders = deliveryData.filter(order => order.delivery_status === 'Delivered').length;
      const fulfillmentRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;
      
      // Calculate financial metrics
      const outstandingBalance = outstandingData.reduce((sum, item) => sum + (item.balance_due || 0), 0);
      const supplierPayable = supplierLedgerData.reduce((sum, item) => 
        sum + (item.debit_amount || 0) - (item.credit_amount || 0), 0);
      
      const totalReceipts = paymentsData
        .filter(payment => payment.type === 'Receipt')
        .reduce((sum, payment) => sum + payment.amount, 0);
      const totalPayments = paymentsData
        .filter(payment => payment.type === 'Payment')
        .reduce((sum, payment) => sum + payment.amount, 0);
      const cashFlowRatio = totalPayments > 0 ? totalReceipts / totalPayments : 0;
      
      // Calculate profit margin
      const profitMargin = (totalSales as number) > 0 ? (grossProfit / (totalSales as number)) * 100 : 0;
      
      return {
        totalSales,
        totalPurchases,
        grossProfit,
        lowStockCount,
        outstandingBalance,
        supplierPayable,
        // New enhanced metrics
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
