import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupplierLedgerEntry {
  id: string;
  supplier_id: string;
  store_id: string;
  transaction_type: 'purchase' | 'payment' | 'opening_balance';
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
  opening_balance: number;
  opening_balance_type: 'debit' | 'credit';
  total_debit: number;   // Purchases
  total_credit: number;  // Payments
  balance: number;       // Final balance
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
      if (storeId && storeId !== 'all') {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as SupplierLedgerEntry[];
    },
  });
};

export const useSupplierBalances = (storeId?: string) => {
  return useQuery({
    queryKey: ['supplier-balances', storeId],
    queryFn: async () => {
      // Get ledger entries
      let ledgerQuery = supabase
        .from('supplier_ledger')
        .select(`
          supplier_id,
          store_id,
          debit_amount,
          credit_amount,
          suppliers(name),
          stores(name)
        `);

      if (storeId && storeId !== 'all') {
        ledgerQuery = ledgerQuery.eq('store_id', storeId);
      }

      const { data: ledgerData, error: ledgerError } = await ledgerQuery;
      if (ledgerError) throw ledgerError;

      // Get opening balances
      let openingQuery = supabase
        .from('supplier_opening_balances')
        .select('*');

      if (storeId && storeId !== 'all') {
        openingQuery = openingQuery.eq('store_id', storeId);
      }

      const { data: openingData, error: openingError } = await openingQuery;
      if (openingError) throw openingError;

      // Create opening balance map: key = supplier_id-store_id
      const openingMap = new Map<string, { amount: number; type: 'debit' | 'credit' }>();
      (openingData || []).forEach((ob: any) => {
        const key = `${ob.supplier_id}-${ob.store_id}`;
        openingMap.set(key, { 
          amount: ob.opening_balance || 0, 
          type: ob.balance_type || 'debit' 
        });
      });

      // Calculate balances by supplier and store
      const balanceMap = new Map<string, SupplierBalance>();
      
      (ledgerData || []).forEach((entry: any) => {
        const key = `${entry.supplier_id}-${entry.store_id}`;
        
        if (!balanceMap.has(key)) {
          const opening = openingMap.get(key);
          const openingAmount = opening?.amount || 0;
          const openingType = opening?.type || 'debit';
          
          balanceMap.set(key, {
            supplier_id: entry.supplier_id,
            supplier_name: entry.suppliers?.name || 'Unknown',
            store_id: entry.store_id,
            store_name: entry.stores?.name || 'Unknown',
            opening_balance: openingAmount,
            opening_balance_type: openingType,
            total_debit: 0,
            total_credit: 0,
            balance: 0
          });
        }
        
        const balance = balanceMap.get(key)!;
        balance.total_debit += entry.debit_amount || 0;
        balance.total_credit += entry.credit_amount || 0;
      });

      // Add suppliers with opening balance but no transactions
      openingMap.forEach((opening, key) => {
        if (!balanceMap.has(key)) {
          const [supplierId, storeIdPart] = key.split('-');
          balanceMap.set(key, {
            supplier_id: supplierId,
            supplier_name: 'Unknown',
            store_id: storeIdPart,
            store_name: 'Unknown',
            opening_balance: opening.amount,
            opening_balance_type: opening.type,
            total_debit: 0,
            total_credit: 0,
            balance: 0
          });
        }
      });

      // Calculate final balance for each entry
      // Balance = Opening (Dr/Cr) + Purchases (Dr) - Payments (Cr)
      // Positive = Due, Negative = Advance
      balanceMap.forEach((balance) => {
        const openingValue = balance.opening_balance_type === 'debit' 
          ? balance.opening_balance 
          : -balance.opening_balance;
        balance.balance = openingValue + balance.total_debit - balance.total_credit;
      });

      return Array.from(balanceMap.values());
    },
  });
};
