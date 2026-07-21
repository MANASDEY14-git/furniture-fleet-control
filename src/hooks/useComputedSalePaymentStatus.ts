import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSecureSalesOrders, SecureSalesOrder } from './useSecureSalesOrders';
import type { SalePaymentStatus } from '@/types/erp';

interface PaymentRecord {
  sale_id: string;
  amount: number;
}

export const useComputedSalePaymentStatus = (storeId?: string, documentType: 'order' | 'quote' = 'order') => {
  // Fetch secure orders
  const { 
    data: secureOrders = [], 
    isLoading: ordersLoading, 
    refetch: refetchOrders,
    error: ordersError 
  } = useSecureSalesOrders(storeId, documentType);

  // Fetch payments for the orders we have access to
  const { 
    data: payments = [], 
    isLoading: paymentsLoading,
    refetch: refetchPayments,
    error: paymentsError
  } = useQuery({
    queryKey: ['sale-payments-for-orders', secureOrders.map(o => o.id)],
    queryFn: async () => {
      if (secureOrders.length === 0) return [];

      const orderIds = secureOrders.map(o => o.id);
      
      // Fetch payments in chunks to avoid URL length limits
      const chunkSize = 50;
      const allPayments: PaymentRecord[] = [];
      
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        const chunk = orderIds.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from('payments')
          .select('sale_id, amount')
          .in('sale_id', chunk)
          .eq('type', 'Receipt');
        
        if (error) throw error;
        if (data) allPayments.push(...data);
      }
      
      return allPayments;
    },
    enabled: secureOrders.length > 0,
  });

  // Compute the payment status for each order
  const computedStatus: SalePaymentStatus[] = secureOrders.map((order: SecureSalesOrder) => {
    // Sum all payments for this order
    const orderPayments = payments.filter(p => p.sale_id === order.id);
    const totalPaid = orderPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balanceDue = order.total_amount - totalPaid;

    return {
      sale_id: order.id,
      store_id: order.store_id,
      supplier_id: order.supplier_id || '',
      order_number: order.order_number,
      sale_date: order.date,
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      customer_address: order.customer_address || '',
      delivery_status: order.delivery_status,
      delivery_date: order.delivery_date || '',
      total_price: order.total_amount,
      total_paid: totalPaid,
      balance_due: balanceDue,
      quote_status: order.quote_status || 'draft',
    };
  });

  // Sort by sale_date descending
  computedStatus.sort((a, b) => 
    new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
  );

  const refetch = () => {
    refetchOrders();
    refetchPayments();
  };

  return {
    data: computedStatus,
    isLoading: ordersLoading || paymentsLoading,
    error: ordersError || paymentsError,
    refetch,
  };
};
