import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BankAccount {
  id: string;
  store_id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  ifsc_code?: string;
  branch_name?: string;
  account_type?: 'savings' | 'current' | 'od';
  is_active: boolean;
  opening_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBankAccountData {
  store_id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  ifsc_code?: string;
  branch_name?: string;
  account_type?: 'savings' | 'current' | 'od';
  opening_balance?: number;
}

export interface UpdateBankAccountData extends Partial<CreateBankAccountData> {
  id: string;
}

export const useBankAccounts = (storeId?: string) => {
  return useQuery({
    queryKey: ['bank-accounts', storeId],
    queryFn: async () => {
      let query = supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (storeId && storeId !== 'all') {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as BankAccount[];
    },
  });
};

export const useAllBankAccounts = () => {
  return useQuery({
    queryKey: ['bank-accounts-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select(`
          *,
          stores (
            name
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (BankAccount & { stores: { name: string } | null })[];
    },
  });
};

export const useCreateBankAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateBankAccountData) => {
      const { data: account, error } = await supabase
        .from('bank_accounts')
        .insert([{
          ...data,
          current_balance: data.opening_balance || 0,
        }])
        .select()
        .single();

      if (error) throw error;
      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-all'] });
      toast({
        title: "Success",
        description: "Bank account created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create bank account: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateBankAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateBankAccountData) => {
      const { data: account, error } = await supabase
        .from('bank_accounts')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return account;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-all'] });
      toast({
        title: "Success",
        description: "Bank account updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update bank account: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteBankAccount = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-all'] });
      toast({
        title: "Success",
        description: "Bank account deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete bank account: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
