
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'debit_card' | 'credit_card' | 'cheque' | 'online_wallet' | 'other';

export interface Payment {
  id: string;
  store_id: string;
  supplier_id?: string;
  amount: number;
  type: 'Payment' | 'Receipt';
  date: string;
  description?: string;
  created_at: string;
  payment_method?: PaymentMethod;
  bank_account_id?: string;
  transaction_reference?: string;
  upi_id?: string;
  card_last_four?: string;
  payment_gateway?: string;
  cheque_number?: string;
  cheque_date?: string;
  bank_charges?: number;
  net_amount?: number;
  payment_status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  cleared_at?: string;
  notes?: string;
}

export interface CreatePaymentData {
  store_id: string;
  supplier_id?: string;
  amount: number;
  type: 'Payment' | 'Receipt';
  date: string;
  description?: string;
  payment_method?: PaymentMethod;
  bank_account_id?: string;
  transaction_reference?: string;
  upi_id?: string;
  card_last_four?: string;
  payment_gateway?: string;
  cheque_number?: string;
  cheque_date?: string;
  bank_charges?: number;
  payment_status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  notes?: string;
}

export const usePayments = () => {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Payment[];
    },
  });
};

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePaymentData) => {
      const { data: payment, error } = await supabase
        .from('payments')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balances'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payment-status'] });
      queryClient.invalidateQueries({ queryKey: ['secure-sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments-for-orders'] });
      queryClient.invalidateQueries({ queryKey: ['real-dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({
        title: "Success",
        description: "Transaction recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
