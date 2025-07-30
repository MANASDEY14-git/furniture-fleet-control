import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MaterialStockMovement {
  id: string;
  material_id: string;
  movement_type: string;
  quantity_change: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_at: string;
  materials: {
    id: string;
    name: string;
    unit?: string;
  };
}

export const useMaterialStockMovements = (materialId?: string) => {
  return useQuery({
    queryKey: ['material-stock-movements', materialId],
    queryFn: async () => {
      let query = supabase
        .from('material_stock_movements')
        .select(`
          *,
          materials (
            id,
            name,
            unit
          )
        `)
        .order('created_at', { ascending: false });

      if (materialId) {
        query = query.eq('material_id', materialId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as MaterialStockMovement[];
    },
  });
};