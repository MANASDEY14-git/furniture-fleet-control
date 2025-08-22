
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DeliveryStatus, CreateSaleData } from '@/types';

export interface Sale {
  id: string;
  store_id: string;
  item_id: string;
  item_name: string;
  supplier_id?: string;
  quantity: number;
  total_price: number;
  delivery_status: DeliveryStatus;
  date: string;
  created_at: string;
}

export const useSales = () => {
  return useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Sale[];
    },
  });
};

export const useCreateSale = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSaleData & { customizations?: any[] }) => {
      // Start a transaction to update inventory and create sale
      const { customizations, ...saleData } = data;
      
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([saleData])
        .select()
        .single();

      if (saleError) throw saleError;

      // If there are customizations, update material stock directly
      if (customizations && customizations.length > 0) {
        // Update material stock for customizations
        for (const custom of customizations) {
          // Get current material quantity
          const { data: material, error: materialError } = await supabase
            .from('materials')
            .select('quantity_available')
            .eq('id', custom.selectedMaterialId)
            .single();

          if (materialError) {
            console.error('Error fetching material:', materialError);
            continue;
          }

          // Update material quantity
          const { error: materialUpdateError } = await supabase
            .from('materials')
            .update({ 
              quantity_available: (material.quantity_available || 0) - custom.quantityUsed,
              updated_at: new Date().toISOString()
            })
            .eq('id', custom.selectedMaterialId);

          if (materialUpdateError) {
            console.error('Error updating material quantity:', materialUpdateError);
          }

          // Create material stock movement record
          const { error: movementError } = await supabase
            .from('material_stock_movements')
            .insert({
              material_id: custom.selectedMaterialId,
              movement_type: 'OUT',
              quantity_change: -custom.quantityUsed,
              reference_type: 'sale',
              reference_id: sale.id,
              notes: `Used for sale - ${custom.selectedOptionName}`
            });

          if (movementError) {
            console.error('Error creating material movement record:', movementError);
          }
        }
      }

      // Get current item quantity
      const { data: item, error: itemError } = await supabase
        .from('items')
        .select('quantity_available')
        .eq('id', saleData.item_id)
        .single();

      if (itemError) {
        await supabase.from('sales').delete().eq('id', sale.id);
        throw itemError;
      }

      // Update item quantity
      const { error: updateError } = await supabase
        .from('items')
        .update({ 
          quantity_available: (item.quantity_available || 0) - saleData.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', saleData.item_id);

      if (updateError) {
        // If updating inventory fails, rollback the sale
        await supabase.from('sales').delete().eq('id', sale.id);
        throw updateError;
      }

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material_stock_movements'] });
      toast({
        title: "Success",
        description: "Sale recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record sale: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: "Success",
        description: "Sale deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete sale: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
