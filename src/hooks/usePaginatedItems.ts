import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Item } from '@/hooks/useItems';

interface PaginatedItemsConfig {
  pageSize?: number;
  searchTerm?: string;
  storeId?: string;
  categoryId?: string;
  showLowStockOnly?: boolean;
}

export const usePaginatedItems = (config: PaginatedItemsConfig = {}) => {
  const { 
    pageSize = 50, 
    searchTerm = '', 
    storeId, 
    categoryId, 
    showLowStockOnly = false 
  } = config;

  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: itemsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['items-paginated', currentPage, pageSize, searchTerm, storeId, categoryId, showLowStockOnly],
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select('*', { count: 'exact' });

      // Apply filters
      if (searchTerm) {
        // Enhanced search: search in item name, variant SKU, and attribute values
        // Using PostgREST's or syntax with proper formatting
        query = query.or(`name.ilike.%${searchTerm}%,id.in.(select item_id from item_variants where sku.ilike.%${searchTerm}%),id.in.(select item_id from item_variants where id.in.(select variant_id from item_variant_attributes where attribute_value_id.in.(select id from attribute_values where value.ilike.%${searchTerm}%)))`);
      }
      
      if (storeId && storeId !== 'all') {
        query = query.eq('store_id', storeId);
      }
      
      if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }
      
      if (showLowStockOnly) {
        query = query.lt('quantity_available', 10);
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        items: data as Item[],
        totalCount: count || 0,
        hasMore: (count || 0) > currentPage * pageSize,
        currentPage,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const paginationInfo = useMemo(() => {
    if (!itemsData) return null;
    
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, itemsData.totalCount);
    
    return {
      startItem,
      endItem,
      totalItems: itemsData.totalCount,
      currentPage,
      totalPages: itemsData.totalPages,
      hasNext: currentPage < itemsData.totalPages,
      hasPrevious: currentPage > 1
    };
  }, [itemsData, currentPage, pageSize]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (itemsData?.totalPages || 1)) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (paginationInfo?.hasNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (paginationInfo?.hasPrevious) {
      setCurrentPage(currentPage - 1);
    }
  };

  const resetToFirstPage = () => {
    setCurrentPage(1);
  };

  return {
    items: itemsData?.items || [],
    isLoading,
    error,
    refetch,
    pagination: paginationInfo,
    goToPage,
    nextPage,
    previousPage,
    resetToFirstPage
  };
};