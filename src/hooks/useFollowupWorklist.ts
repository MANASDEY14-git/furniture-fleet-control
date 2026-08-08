import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoreContext } from '@/contexts/StoreContext';
import { useToast } from '@/hooks/use-toast';

export type FollowupKind = 'collect' | 'paid_not_delivered' | 'delivery_slipping' | 'cold_quote';

export interface FollowupRow {
  kind: FollowupKind;
  priority: number;
  order_id: string;
  order_number: string;
  order_date: string;
  document_type: string | null;
  quote_status: string | null;
  delivery_status: string | null;
  delivery_date: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  collected: number;
  balance_due: number;
  age_days: number;
  age_bucket: string | null;
  last_followup_at: string | null;
  last_note: string | null;
  next_action_date: string | null;
  snoozed: boolean;
}

export const useFollowupWorklist = () => {
  const { activeStoreId } = useStoreContext();

  return useQuery({
    queryKey: ['followup-worklist', activeStoreId],
    queryFn: async (): Promise<FollowupRow[]> => {
      if (!activeStoreId || activeStoreId === 'all') return [];
      const { data, error } = await supabase.rpc('get_followup_worklist', {
        _store_id: activeStoreId,
      });
      if (error) throw error;
      return (data || []) as FollowupRow[];
    },
    enabled: !!activeStoreId && activeStoreId !== 'all',
    staleTime: 60_000,
  });
};

export const useLogFollowup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeStoreId } = useStoreContext();

  return useMutation({
    mutationFn: async ({
      orderId,
      outcome,
      note,
      nextActionDate,
      snoozeUntil,
    }: {
      orderId: string;
      outcome: string;
      note?: string;
      nextActionDate?: string | null;
      snoozeUntil?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('order_followups').insert({
        order_id: orderId,
        store_id: activeStoreId!,
        outcome,
        note: note || null,
        next_action_date: nextActionDate || null,
        snooze_until: snoozeUntil || null,
        created_by: userData?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-worklist'] });
      toast({ title: 'Follow-up logged' });
    },
    onError: (error: any) =>
      toast({ title: 'Could not save follow-up', description: error.message, variant: 'destructive' }),
  });
};
