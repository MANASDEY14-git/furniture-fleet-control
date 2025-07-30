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
      // Use the enhanced search function
      const { data, error } = await supabase.rpc('search_items_enhanced', {
        search_term: searchTerm || null,
        store_id_filter: storeId && storeId !== 'all' ? storeId : null,
        category_id_filter: categoryId && categoryId !== 'all' ? categoryId : null,
        show_low_stock_only: showLowStockOnly,
        page_size: pageSize,
        page_offset: (currentPage - 1) * pageSize
      });

      if (error) throw error;

      const totalCount = data && data.length > 0 ? data[0].total_count : 0;

      return {
        items: data as Item[],
        totalCount: totalCount,
        hasMore: totalCount > currentPage * pageSize,
        currentPage,
        totalPages: Math.ceil(totalCount / pageSize)
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