import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PurchaseOrderItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CreatePurchaseOrderData {
  order_number: string;
  store_id: string;
  supplier_id?: string;
  date: string;
  items: PurchaseOrderItem[];
}

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderData) => {
      // Create individual purchase records for each item
      const purchasePromises = data.items.map(item => 
        supabase
          .from('purchases')
          .insert([{
            store_id: data.store_id,
            supplier_id: data.supplier_id,
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            total_cost: item.total_price,
            date: data.date,
            invoice_number: data.order_number
          }])
          .select()
          .single()
      );

      const results = await Promise.all(purchasePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error.message);
      }

      // Stock is automatically updated by database triggers
      return results.map(result => result.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create purchase order: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};