
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SalePaymentStatus } from '@/types/erp';

export const useSalePaymentStatus = () => {
  return useQuery({
    queryKey: ['sale-payment-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_payment_status')
        .select('*')
        .order('sale_date', { ascending: false });
      
      if (error) throw error;
      return data as SalePaymentStatus[];
    },
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (paymentData: {
      sale_id: string;
      amount: number;
      date: string;
      description?: string;
      store_id: string;
      order_description?: string;
    }) => {
      // Get sales order description if not provided and use it in payment description
      let finalDescription = paymentData.description || `Payment for sale`;
      
      if (!paymentData.description && paymentData.order_description) {
        finalDescription = `${paymentData.order_description} (Payment)`;
      }

      const { data, error } = await supabase
        .from('payments')
        .insert([{
          sale_id: paymentData.sale_id,
          amount: paymentData.amount,
          type: 'Receipt',
          date: paymentData.date,
          description: finalDescription,
          store_id: paymentData.store_id,
          reference_type: 'sale',
          reference_id: paymentData.sale_id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-payment-status'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['secure-sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments-for-orders'] });
      queryClient.invalidateQueries({ queryKey: ['real-dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balances'] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record payment: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateDeliveryStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ saleId }: { saleId: string }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({ 
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', saleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-payment-status'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['secure-sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments-for-orders'] });
      queryClient.invalidateQueries({ queryKey: ['real-dashboard-metrics'] });
      toast({
        title: "Success",
        description: "Order marked as delivered successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update delivery status: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateDeliveryDate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ saleId, deliveryDate }: { saleId: string; deliveryDate: string }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({ delivery_date: deliveryDate })
        .eq('id', saleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-payment-status'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['secure-sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments-for-orders'] });
      queryClient.invalidateQueries({ queryKey: ['real-dashboard-metrics'] });
      toast({
        title: "Success",
        description: "Delivery date updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update delivery date: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useBulkMarkDelivered = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (saleIds: string[]) => {
      const { error } = await supabase
        .from('sales_orders')
        .update({ 
          delivery_status: 'Delivered',
          delivered_at: new Date().toISOString()
        })
        .in('id', saleIds);

      if (error) throw error;
    },
    onSuccess: (_, saleIds) => {
      queryClient.invalidateQueries({ queryKey: ['sale-payment-status'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['secure-sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments-for-orders'] });
      queryClient.invalidateQueries({ queryKey: ['real-dashboard-metrics'] });
      toast({
        title: "Success",
        description: `${saleIds.length} order(s) marked as delivered`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update orders: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
