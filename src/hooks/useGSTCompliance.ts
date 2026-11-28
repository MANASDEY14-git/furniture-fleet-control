import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GSTR1B2BRecord {
  order_id: string;
  invoice_number: string;
  invoice_date: string;
  invoice_value: number;
  pos_state_code: string;
  pos_state_name: string;
  reverse_charge: string;
  invoice_type: string;
  recipient_gstin: string;
  recipient_name: string;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax_amount: number;
  store_name: string;
  supplier_gstin: string;
}

export interface GSTR1B2CSRecord {
  type: string;
  pos_state_code: string;
  pos_state_name: string;
  rate: number;
  total_taxable_value: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  invoice_count: number;
}

export interface GSTR1HSNRecord {
  hsn_code: string;
  description: string;
  uqc: string;
  total_quantity: number;
  total_value: number;
  taxable_value: number;
  integrated_tax_amount: number;
  central_tax_amount: number;
  state_tax_amount: number;
  total_tax_amount: number;
}

export interface GSTR3BRecord {
  tax_period: string;
  nature_of_supplies: string;
  total_taxable_value: number;
  total_igst: number;
  total_cgst: number;
  total_sgst: number;
  total_cess: number;
}

export function useGSTCompliance() {
  const b2bQuery = useQuery({
    queryKey: ['gst-gstr1-b2b'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_gstr1_b2b' as any)
        .select('*');
      if (error) throw error;
      return (data || []) as unknown as GSTR1B2BRecord[];
    },
  });

  const b2csQuery = useQuery({
    queryKey: ['gst-gstr1-b2cs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_gstr1_b2cs' as any)
        .select('*');
      if (error) throw error;
      return (data || []) as unknown as GSTR1B2CSRecord[];
    },
  });

  const hsnQuery = useQuery({
    queryKey: ['gst-gstr1-hsn'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_gstr1_hsn_summary' as any)
        .select('*');
      if (error) throw error;
      return (data || []) as unknown as GSTR1HSNRecord[];
    },
  });

  const gstr3bQuery = useQuery({
    queryKey: ['gst-gstr3b'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_gstr3b_outward_supplies' as any)
        .select('*')
        .order('tax_period', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as GSTR3BRecord[];
    },
  });

  return {
    b2bData: b2bQuery.data || [],
    b2csData: b2csQuery.data || [],
    hsnData: hsnQuery.data || [],
    gstr3bData: gstr3bQuery.data || [],
    isLoading: b2bQuery.isLoading || b2csQuery.isLoading || hsnQuery.isLoading || gstr3bQuery.isLoading,
    refetch: () => {
      b2bQuery.refetch();
      b2csQuery.refetch();
      hsnQuery.refetch();
      gstr3bQuery.refetch();
    },
  };
}
