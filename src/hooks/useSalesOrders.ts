
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DeliveryStatus, CreateSalesOrderData, SalesOrder } from '@/types';

export const useSalesOrders = () => {
  return useQuery({
    queryKey: ['sales-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          id,
          sales_order_items(id, item_id, item_name, quantity, unit_price, total_price)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
};

export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSalesOrderData) => {
      // Create the sales order with customer and payment fields
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .insert([{
          order_number: data.order_number,
          store_id: data.store_id,
          supplier_id: data.supplier_id,
          delivery_status: data.delivery_status,
          date: data.date,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_address: data.customer_address,
          delivery_date: data.delivery_date,
          advance_paid: data.advance_paid || 0,
          description: data.description,
          total_amount: data.items.reduce((sum, item) => sum + item.total_price, 0)
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = data.items.map(item => ({
        order_id: order.id,
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems);

      if (itemsError) {
        // Rollback order if items fail
        await supabase.from('sales_orders').delete().eq('id', order.id);
        throw itemsError;
      }

      // Create advance payment record if advance was paid
      if (data.advance_paid && data.advance_paid > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert([{
            type: 'Receipt',
            amount: data.advance_paid,
            date: data.date,
            sale_id: order.id,
            store_id: data.store_id,
            description: data.description ? `${data.description} (Advance payment for order ${data.order_number})` : `Advance payment for order ${data.order_number}`,
            reference_type: 'sales_order',
            reference_id: order.id
          }]);

        if (paymentError) {
          console.error('Failed to create advance payment record:', paymentError);
        }
      }

      // Note: Stock deduction is now handled by database triggers
      // The handle_sales_variant_stock_v2 trigger will automatically
      // deduct stock from variants or items based on sales_order_items

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payment-status'] });
      queryClient.invalidateQueries({ queryKey: ['payment-summary'] });
      toast({
        title: "Success",
        description: "Sales order created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create sales order: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateSalesOrderStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, delivery_status }: { id: string; delivery_status: DeliveryStatus }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({ delivery_status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update order status: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
