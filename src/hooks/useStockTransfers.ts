import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type TransferStatus = 'draft' | 'in_transit' | 'partially_received' | 'received' | 'received_with_discrepancy' | 'cancelled';

export interface TransferLine {
  id: string;
  source_item_id: string;
  destination_item_id: string;
  item_name_snapshot: string;
  unit_snapshot: string;
  quantity_dispatched: number;
  unit_transfer_price: number;
  line_value: number;
  quantity_received: number;
  quantity_damaged: number;
  quantity_short: number;
  condition_note: string | null;
}

export interface StockTransfer {
  id: string;
  source_store_id: string;
  destination_store_id: string;
  status: TransferStatus;
  draft_reference: string;
  challan_number: string | null;
  transfer_reason: string;
  planned_dispatch_date: string;
  expected_arrival_date: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  transporter_name: string | null;
  vehicle_number: string | null;
  lr_number: string | null;
  external_document_reference: string | null;
  notes: string | null;
  total_quantity: number;
  total_value: number;
  created_by: string;
  dispatched_by: string | null;
  created_at: string;
  stock_transfer_lines: TransferLine[];
}

export interface DraftTransferInput {
  sourceStoreId: string;
  destinationStoreId: string;
  reason: string;
  plannedDispatchDate: string;
  expectedArrivalDate?: string;
  transporterName?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  externalDocumentReference?: string;
  notes?: string;
  lines: Array<{
    source_item_id: string;
    destination_item_id?: string;
    quantity: number;
    unit_transfer_price: number;
    condition_note?: string;
  }>;
}

export interface ReceiptInput {
  transferId: string;
  notes?: string;
  lines: Array<{
    transfer_line_id: string;
    quantity_received: number;
    quantity_damaged: number;
    quantity_short: number;
    discrepancy_note?: string;
  }>;
}

export interface TransferSettings {
  store_id: string;
  godown_code: string;
  challan_prefix: string;
  address: string | null;
  phone: string | null;
  contact_person: string | null;
}

export function useTransferSettings() {
  return useQuery({
    queryKey: ['transfer-settings'],
    queryFn: async (): Promise<TransferSettings[]> => {
      const { data, error } = await supabase.from('store_transfer_settings').select('*');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });
}

export function useSaveTransferSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (settings: TransferSettings) => {
      const { error } = await supabase.from('store_transfer_settings').upsert(settings, { onConflict: 'store_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfer-settings'] });
      toast({ title: 'Success', description: 'Godown challan settings saved' });
    },
    onError: (error: Error) => toast({ title: 'Settings not saved', description: error.message, variant: 'destructive' }),
  });
}

export function useStockTransfers(storeId?: string) {
  return useQuery({
    queryKey: ['stock-transfers', storeId],
    queryFn: async (): Promise<StockTransfer[]> => {
      let query = supabase
        .from('stock_transfers')
        .select('*, stock_transfer_lines(*)')
        .order('created_at', { ascending: false });

      if (storeId && storeId !== 'all') {
        query = query.or(`source_store_id.eq.${storeId},destination_store_id.eq.${storeId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StockTransfer[];
    },
    staleTime: 60_000,
  });
}

function useTransferMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  successMessage: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-ledger'] });
      toast({ title: 'Success', description: successMessage });
    },
    onError: (error: Error) => {
      toast({ title: 'Transfer not completed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateStockTransfer() {
  return useTransferMutation<DraftTransferInput, string>(async (input) => {
    const { data, error } = await supabase.rpc('create_stock_transfer_draft', {
      _source_store_id: input.sourceStoreId,
      _destination_store_id: input.destinationStoreId,
      _transfer_reason: input.reason,
      _planned_dispatch_date: input.plannedDispatchDate,
      _expected_arrival_date: input.expectedArrivalDate || null,
      _transporter_name: input.transporterName || null,
      _vehicle_number: input.vehicleNumber || null,
      _lr_number: input.lrNumber || null,
      _external_document_reference: input.externalDocumentReference || null,
      _notes: input.notes || null,
      _lines: input.lines,
    });
    if (error) throw error;
    return data;
  }, 'Transfer batch saved as a draft');
}

export function useDispatchStockTransfer() {
  return useTransferMutation<string, string>(async (transferId) => {
    const { data, error } = await supabase.rpc('dispatch_stock_transfer', { _transfer_id: transferId });
    if (error) throw error;
    return data;
  }, 'Stock dispatched and challan number assigned');
}

export function useReceiveStockTransfer() {
  return useTransferMutation<ReceiptInput, string>(async (input) => {
    const { data, error } = await supabase.rpc('receive_stock_transfer', {
      _transfer_id: input.transferId,
      _notes: input.notes || null,
      _lines: input.lines,
    });
    if (error) throw error;
    return data;
  }, 'Receipt recorded and destination stock updated');
}

export function useCancelStockTransfer() {
  return useTransferMutation<{ transferId: string; reason: string }, void>(async ({ transferId, reason }) => {
    const { error } = await supabase.rpc('cancel_stock_transfer', { _transfer_id: transferId, _reason: reason });
    if (error) throw error;
  }, 'Transfer cancelled');
}