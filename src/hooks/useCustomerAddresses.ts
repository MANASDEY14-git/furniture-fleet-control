import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label?: string | null;
  address: string;
  contact_person?: string | null;
  phone?: string | null;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useCustomerAddresses = (customerId?: string) => {
  return useQuery({
    queryKey: ['customer-addresses', customerId],
    queryFn: async () => {
      if (!customerId) return [] as CustomerAddress[];
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return (data ?? []) as CustomerAddress[];
    },
    enabled: !!customerId,
  });
};

export const useCreateCustomerAddress = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (address: Omit<CustomerAddress, 'id' | 'created_at' | 'updated_at'>) => {
      if (address.is_default) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('customer_id', address.customer_id);
      }

      const { data, error } = await supabase
        .from('customer_addresses')
        .insert([address])
        .select()
        .single();

      if (error) throw error;
      return data as CustomerAddress;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', data.customer_id] });
      toast({ title: 'Success', description: 'Address added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to add address: ${error.message}`, variant: 'destructive' });
    },
  });
};

export const useUpdateCustomerAddress = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (address: Partial<CustomerAddress> & { id: string; customer_id: string }) => {
      if (address.is_default) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('customer_id', address.customer_id);
      }

      const { data, error } = await supabase
        .from('customer_addresses')
        .update(address)
        .eq('id', address.id)
        .select()
        .single();

      if (error) throw error;
      return data as CustomerAddress;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', data.customer_id] });
      toast({ title: 'Success', description: 'Address updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to update address: ${error.message}`, variant: 'destructive' });
    },
  });
};

export const useDeleteCustomerAddress = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string; customerId: string }) => {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', variables.customerId] });
      toast({ title: 'Success', description: 'Address deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: `Failed to delete address: ${error.message}`, variant: 'destructive' });
    },
  });
};
