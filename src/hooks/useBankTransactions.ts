import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BankTransaction {
  id: string;
  date: string;
  amount: number;
  bank_charges: number | null;
  net_amount: number | null;
  type: string;
  description: string | null;
  supplier_name: string | null;
  payment_method: string | null;
  payment_status: string | null;
  transaction_reference: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  store_name: string | null;
  cheque_number: string | null;
  cheque_date: string | null;
  cleared_at: string | null;
  upi_id: string | null;
  card_last_four: string | null;
  payment_gateway: string | null;
  created_at: string;
}

export const useBankTransactions = (
  storeId?: string,
  bankAccountId?: string,
  startDate?: string,
  endDate?: string
) => {
  return useQuery({
    queryKey: ['bank-transactions', storeId, bankAccountId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          id,
          date,
          amount,
          bank_charges,
          net_amount,
          type,
          description,
          payment_method,
          payment_status,
          transaction_reference,
          cheque_number,
          cheque_date,
          cleared_at,
          upi_id,
          card_last_four,
          payment_gateway,
          created_at,
          bank_account_id,
          store_id,
          supplier_id,
          bank_accounts (
            id,
            account_name,
            account_number,
            bank_name
          ),
          stores (
            name
          ),
          suppliers (
            name
          )
        `)
        .not('bank_account_id', 'is', null)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (storeId && storeId !== 'all') {
        query = query.eq('store_id', storeId);
      }

      if (bankAccountId && bankAccountId !== 'all') {
        query = query.eq('bank_account_id', bankAccountId);
      }

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        date: item.date,
        amount: item.amount,
        bank_charges: item.bank_charges,
        net_amount: item.net_amount,
        type: item.type,
        description: item.description,
        supplier_name: item.suppliers?.name || null,
        payment_method: item.payment_method,
        payment_status: item.payment_status,
        transaction_reference: item.transaction_reference,
        bank_name: item.bank_accounts?.bank_name || null,
        account_name: item.bank_accounts?.account_name || null,
        account_number: item.bank_accounts?.account_number || null,
        store_name: item.stores?.name || null,
        cheque_number: item.cheque_number,
        cheque_date: item.cheque_date,
        cleared_at: item.cleared_at,
        upi_id: item.upi_id,
        card_last_four: item.card_last_four,
        payment_gateway: item.payment_gateway,
        created_at: item.created_at,
      })) as BankTransaction[];
    },
  });
};
