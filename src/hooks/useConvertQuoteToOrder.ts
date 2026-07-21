import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useConvertQuoteToOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc('convert_quote_to_order', {
        _order_id: orderId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Quote converted to order');
      queryClient.invalidateQueries({ queryKey: ['computed-sale-payment-status'] });
      queryClient.invalidateQueries({ queryKey: ['secure-sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments-for-orders'] });
    },
    onError: (error: any) => {
      toast.error('Failed to convert quote: ' + error.message);
    },
  });
};
