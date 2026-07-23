
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
          delivery_status,
          delivered_at,
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
      // Prepare items for the RPC function
      const itemsJson = data.items.map(item => ({
        item_id: item.item_id,
        item_name: item.item_name,
        variant_id: item.variant_id || null,
        supplier_id: item.supplier_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }));

      const totalAmount = data.items.reduce((sum, item) => sum + item.total_price, 0);

      // Build customizations JSON for the RPC
      const customizationsJson = (data.customizations || []).map(c => ({
        bom_component_id: c.bom_component_id,
        selected_material_id: c.selected_material_id,
        selected_option_name: c.selected_option_name,
        quantity_used: c.quantity_used,
      }));

      // Use the secure RPC function that handles everything atomically
      const { data: orderId, error } = await supabase.rpc('create_sales_order_secure', {
        _order_number: data.order_number,
        _store_id: data.store_id,
        _supplier_id: data.supplier_id || null,
        _date: data.date,
        _customer_name: data.customer_name || null,
        _customer_phone: data.customer_phone || null,
        _customer_address: data.customer_address || null,
        _delivery_date: data.delivery_date || null,
        _delivery_status: data.delivery_status,
        _advance_paid: data.advance_paid || 0,
        _description: data.description || null,
        _total_amount: totalAmount,
        _items: itemsJson,
        _customizations: customizationsJson,
        _customer_id: data.customer_id || null,
        _document_type: data.document_type || 'order',
        _salesperson_name: data.salesperson_name || null,
        _advance_payment_method: data.advance_payment_method || 'cash',
        _advance_bank_account_id: data.advance_bank_account_id || null
      });

      if (error) throw error;

      // Return an object with the order id for consistency
      return { id: orderId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['secure-sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments-for-orders'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payment-status'] });
      queryClient.invalidateQueries({ queryKey: ['payment-summary'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-stock-movements'] });
      const isQuote = (variables as any)?.document_type === 'quote';
      toast({
        title: "Success",
        description: isQuote ? "Quote created successfully" : "Sales order created successfully",
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

export const useCancelSalesOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      orderId, 
      cancellationReason 
    }: { 
      orderId: string; 
      cancellationReason: string;
    }) => {
      const { data, error } = await supabase
        .from('sales_orders')
        .update({ 
          delivery_status: 'Cancelled',
          cancellation_reason: cancellationReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['secure-sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payment-status'] });
      toast({ 
        title: "Order Cancelled", 
        description: "Stock has been restored to inventory" 
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to cancel order: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
