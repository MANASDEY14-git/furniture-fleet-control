
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Attribute {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface AttributeWithValues extends Attribute {
  attribute_values: AttributeValue[];
}

export const useAttributes = () => {
  return useQuery({
    queryKey: ['attributes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attributes')
        .select(`
          *,
          attribute_values (*)
        `)
        .order('name');
      
      if (error) throw error;
      return data as AttributeWithValues[];
    },
  });
};

export const useCreateAttribute = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('attributes')
        .insert([{ name }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      toast({
        title: "Success",
        description: "Attribute created successfully",
      });
    },
    onError: (error: any) => {
      console.error('Error creating attribute:', error);
      const message = error.code === '23505' 
        ? 'An attribute with this name already exists. Please choose a different name.'
        : `Failed to create attribute: ${error.message}`;
      
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

export const useCreateAttributeValue = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ attribute_id, value }: { attribute_id: string; value: string }) => {
      const { data, error } = await supabase
        .from('attribute_values')
        .insert([{ attribute_id, value }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attributes'] });
      toast({
        title: "Success",
        description: "Attribute value created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create attribute value: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
