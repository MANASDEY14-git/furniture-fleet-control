import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  classification: string;
  normal_balance: 'debit' | 'credit';
  parent_id?: string;
  is_group: boolean;
  is_active: boolean;
  description?: string;
}

export interface TrialBalanceItem {
  account_id: string;
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  classification: string;
  normal_balance: 'debit' | 'credit';
  total_debit: number;
  total_credit: number;
  net_balance: number;
}

export interface JournalEntryLine {
  id?: string;
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  narration?: string;
  line_order?: number;
  account?: {
    code: string;
    name: string;
  };
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  voucher_type: 'contra' | 'payment' | 'receipt' | 'journal' | 'sales' | 'purchase' | 'credit_note' | 'debit_note';
  store_id?: string;
  reference_type?: string;
  reference_id?: string;
  narration?: string;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted' | 'cancelled';
  created_at: string;
  journal_entry_lines?: JournalEntryLine[];
}

export interface PostJournalEntryParams {
  voucher_type: 'contra' | 'payment' | 'receipt' | 'journal' | 'sales' | 'purchase' | 'credit_note' | 'debit_note';
  entry_date: string;
  narration?: string;
  store_id?: string;
  reference_type?: string;
  reference_id?: string;
  lines: {
    account_id: string;
    debit_amount: number;
    credit_amount: number;
    narration?: string;
  }[];
}

export const useChartOfAccounts = () => {
  return useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      return (data || []) as ChartOfAccount[];
    },
  });
};

export const useTrialBalance = () => {
  return useQuery({
    queryKey: ['trial-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_trial_balance')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        total_debit: parseFloat(row.total_debit || '0'),
        total_credit: parseFloat(row.total_credit || '0'),
        net_balance: parseFloat(row.net_balance || '0'),
      })) as TrialBalanceItem[];
    },
  });
};

export const useJournalEntries = () => {
  return useQuery({
    queryKey: ['journal-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines(
            id,
            account_id,
            debit_amount,
            credit_amount,
            narration,
            line_order,
            account:chart_of_accounts(code, name)
          )
        `)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as JournalEntry[];
    },
  });
};

export const usePostJournalEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: PostJournalEntryParams) => {
      const { data, error } = await supabase.rpc('post_journal_entry_atomic', {
        p_voucher_type: params.voucher_type,
        p_entry_date: params.entry_date,
        p_narration: params.narration || null,
        p_store_id: params.store_id || null,
        p_reference_type: params.reference_type || 'manual',
        p_reference_id: params.reference_id || null,
        p_lines: params.lines,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      toast({
        title: "Voucher Posted",
        description: "Double-entry journal voucher balanced and posted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Posting Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
