
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PaymentSummary } from '@/types/erp';

export const usePaymentSummary = (storeId?: string) => {
  return useQuery({
    queryKey: ['payment-summary', storeId],
    queryFn: async () => {
      let query = supabase.from('payment_summary').select('*');
      
      if (storeId && storeId !== 'all') {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as PaymentSummary[];
    },
  });
};
