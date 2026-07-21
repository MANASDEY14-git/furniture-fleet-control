import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerLedgerEntry {
  id: string;
  customer_id: string;
  date: string;
  description: string;
  transaction_type: 'Sale' | 'Payment' | 'Refund' | 'Adjustment';
  amount: number;
  balance: number;
  reference_id?: string;
  created_at: string;
}

export const useCustomerLedger = (customerId?: string) => {
  return useQuery({
    queryKey: ['customer-ledger', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('customer_ledger')
        .select('*')
        .eq('customer_id', customerId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerLedgerEntry[];
    },
    enabled: !!customerId,
  });
};
