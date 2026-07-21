import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MaterialPurchase {
  id: string;
  material_id: string;
  supplier_id?: string;
  store_id?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  invoice_number?: string;
  date: string;
  created_at: string;
  materials: {
    id: string;
    name: string;
    unit?: string;
  };
  suppliers?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateMaterialPurchaseData {
  material_id: string;
  supplier_id?: string;
  store_id?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  invoice_number?: string;
  date: string;
}

export interface CreateMultipleMaterialPurchasesData {
  invoiceNumber: string;
  invoiceDate: string;
  supplierId?: string;
  storeId?: string;
  items: {
    material_id: string;
    materialName?: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
  }[];
}

export const useMaterialPurchases = (storeId?: string) => {
  return useQuery({
    queryKey: ['material-purchases', storeId],
    queryFn: async () => {
      let query = supabase
        .from('material_purchases')
        .select(`
          *,
          materials (
            id,
            name,
            unit
          ),
          suppliers (
            id,
            name
          )
        `)
        .order('date', { ascending: false });
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as MaterialPurchase[];
    },
  });
};

export const useCreateMaterialPurchase = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMaterialPurchaseData & { materialName?: string }) => {
      const { data: purchase, error } = await supabase
        .from('material_purchases')
        .insert([{
          material_id: data.material_id,
          supplier_id: data.supplier_id,
          store_id: data.store_id,
          quantity: data.quantity,
          unit_cost: data.unit_cost,
          total_cost: data.total_cost,
          invoice_number: data.invoice_number,
          date: data.date,
        }])
        .select()
        .single();

      if (error) throw error;
      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balances'] });
      toast({
        title: "Success",
        description: "Material purchase recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record material purchase: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useCreateMultipleMaterialPurchases = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateMultipleMaterialPurchasesData) => {
      const purchases = data.items.map(item => ({
        material_id: item.material_id,
        supplier_id: data.supplierId || null,
        store_id: data.storeId || null,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
        invoice_number: data.invoiceNumber,
        date: data.invoiceDate,
      }));

      const { data: result, error } = await supabase
        .from('material_purchases')
        .insert(purchases)
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balances'] });
      toast({
        title: "Success",
        description: `${variables.items.length} material purchase(s) recorded successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record material purchases: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};