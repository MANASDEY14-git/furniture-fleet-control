import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface SalesForecast {
  historical: Array<{
    month: string;
    total: number;
    year: number;
    monthNum: number;
  }>;
  predictions: Array<{
    month: string;
    predicted_amount: number;
    confidence: number;
  }>;
  insights: string[];
}

export interface RestockRecommendation {
  item_id: string;
  item_name: string;
  current_stock: number;
  daily_velocity: number;
  days_until_stockout: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  recommended_quantity: number;
  estimated_cost: number;
  profit_margin: number;
  profit_percentage: number;
  reason: string;
}

export interface MaterialRecommendation {
  option_name: string;
  score: number;
  reason: string;
}

export interface SalesStrategy {
  item_id: string;
  item_name: string;
  strategy_type: 'clearance' | 'premium_pricing' | 'bundle' | 'cost_optimization';
  current_price: number;
  recommended_price: number;
  discount_percentage: number;
  reason: string;
  estimated_impact: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
}

export function useSalesForecast(storeId: string, timeframe: string = '6') {
  return useQuery({
    queryKey: ['sales-forecast', storeId, timeframe],
    queryFn: async (): Promise<SalesForecast> => {
      const { data, error } = await supabase.functions.invoke('sales-forecast', {
        body: { storeId, timeframe }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 2
  });
}

export function useRestockRecommendations(storeId: string) {
  return useQuery({
    queryKey: ['restock-recommendations', storeId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('restock-recommendations', {
        body: { storeId }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 15, // 15 minutes
    retry: 2
  });
}

export function useMaterialRecommendations() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ itemId, componentId, customerPreferences }: {
      itemId: string;
      componentId: string;
      customerPreferences?: any;
    }) => {
      const { data, error } = await supabase.functions.invoke('material-advisor', {
        body: { itemId, componentId, customerPreferences }
      });
      
      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to get material recommendations",
        variant: "destructive"
      });
    }
  });
}

export function useSalesStrategy(storeId: string) {
  return useQuery({
    queryKey: ['sales-strategy', storeId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('sales-strategy', {
        body: { storeId }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 2
  });
}

export function useRefreshAIInsights() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (storeId: string) => {
      // Invalidate all AI-related queries for the store
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales-forecast', storeId] }),
        queryClient.invalidateQueries({ queryKey: ['restock-recommendations', storeId] }),
        queryClient.invalidateQueries({ queryKey: ['sales-strategy', storeId] })
      ]);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI insights refreshed successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to refresh AI insights",
        variant: "destructive"
      });
    }
  });
}