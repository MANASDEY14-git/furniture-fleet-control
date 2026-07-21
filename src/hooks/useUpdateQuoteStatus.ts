import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

const statusLabels: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export const useUpdateQuoteStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, quoteStatus }: { orderId: string; quoteStatus: QuoteStatus }) => {
      const { error } = await supabase.rpc('update_quote_status' as any, {
        _order_id: orderId,
        _quote_status: quoteStatus,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(`Quote marked as ${statusLabels[variables.quoteStatus]}`);
      queryClient.invalidateQueries({ queryKey: ['secure-sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['computed-sale-payment-status'] });
    },
    onError: (error: any) => {
      toast.error('Failed to update quote status: ' + error.message);
    },
  });
};
