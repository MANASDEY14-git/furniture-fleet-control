import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFinancialYear } from '@/contexts/FinancialYearContext';

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
  const { selectedYear } = useFinancialYear();
  return useQuery({
    queryKey: ['customer-ledger', customerId, selectedYear?.id],
    queryFn: async () => {
      if (!customerId) return [];

      let query = supabase
        .from('customer_ledger')
        .select('*')
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (selectedYear) {
        query = query
          .gte('transaction_date', selectedYear.start_date)
          .lte('transaction_date', selectedYear.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerLedgerEntry[];
    },
    enabled: !!customerId,
  });
};

