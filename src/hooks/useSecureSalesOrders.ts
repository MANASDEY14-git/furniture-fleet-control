import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SecureSalesOrder {
  id: string;
  order_number: string;
  store_id: string;
  supplier_id?: string;
  date: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  delivery_status: string;
  advance_paid?: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  description?: string;
  status?: string;
  balance_due?: number;
  delivered_at?: string;
  delivery_date?: string;
  document_type?: string;
  quote_status?: string;
}

export const useSecureSalesOrders = (storeId?: string, documentType: 'order' | 'quote' = 'order') => {
  return useQuery({
    queryKey: ['secure-sales-orders', storeId, documentType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_sales_orders_for_user', {
        _store_id: storeId || null,
        _document_type: documentType
      });
      
      if (error) throw error;
      return data as SecureSalesOrder[];
    },
  });
};

export const useCanAccessCustomerPII = () => {
  return useQuery({
    queryKey: ['can-access-customer-pii'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('can_access_customer_pii');
      
      if (error) throw error;
      return data as boolean;
    },
  });
};