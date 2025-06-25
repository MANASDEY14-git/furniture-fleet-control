
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupplierLedgerEntry {
  id: string;
  supplier_id: string;
  store_id: string;
  transaction_type: 'purchase' | 'payment';
  debit_amount: number;
  credit_amount: number;
  invoice_number?: string;
  payment_reference?: string;
  description?: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  suppliers?: {
    name: string;
  };
  stores?: {
    name: string;
  };
}

export interface SupplierBalance {
  supplier_id: string;
  supplier_name: string;
  store_id: string;
  store_name: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export const useSupplierLedger = (supplierId?: string, storeId?: string) => {
  return useQuery({
    queryKey: ['supplier-ledger', supplierId, storeId],
    queryFn: async () => {
      let query = supabase
        .from('supplier_ledger')
        .select(`
          *,
          suppliers(name),
          stores(name)
        `)
        .order('transaction_date', { ascending: false });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }
      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as SupplierLedgerEntry[];
    },
  });
};

export const useSupplierBalances = () => {
  return useQuery({
    queryKey: ['supplier-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_ledger')
        .select(`
          supplier_id,
          store_id,
          debit_amount,
          credit_amount,
          suppliers(name),
          stores(name)
        `);

      if (error) throw error;

      // Calculate balances by supplier and store
      const balanceMap = new Map<string, SupplierBalance>();
      
      data.forEach((entry: any) => {
        const key = `${entry.supplier_id}-${entry.store_id}`;
        
        if (!balanceMap.has(key)) {
          balanceMap.set(key, {
            supplier_id: entry.supplier_id,
            supplier_name: entry.suppliers?.name || 'Unknown',
            store_id: entry.store_id,
            store_name: entry.stores?.name || 'Unknown',
            total_debit: 0,
            total_credit: 0,
            balance: 0
          });
        }
        
        const balance = balanceMap.get(key)!;
        balance.total_debit += entry.debit_amount || 0;
        balance.total_credit += entry.credit_amount || 0;
        balance.balance = balance.total_debit - balance.total_credit;
      });

      return Array.from(balanceMap.values());
    },
  });
};
