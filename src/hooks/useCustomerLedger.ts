import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerLedgerEntry {
  id: string;
  customer_id: string;
  transaction_date: string;
  notes: string;
  transaction_type: 'sale' | 'payment' | 'opening_balance' | 'adjustment';
  debit_amount: number;
  credit_amount: number;
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
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerLedgerEntry[];
    },
    enabled: !!customerId,
  });
};
