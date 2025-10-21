import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Item } from '@/hooks/useItems';

interface InfiniteItemsConfig {
  pageSize?: number;
  searchTerm?: string;
  storeId?: string;
  categoryId?: string;
  supplierId?: string;
  showLowStockOnly?: boolean;
}

interface ItemsPage {
  items: Item[];
  nextCursor: number | null;
  hasMore: boolean;
  totalCount: number;
}

export const useInfiniteItems = (config: InfiniteItemsConfig = {}) => {
  const { 
    pageSize = 20, 
    searchTerm = '', 
    storeId, 
    categoryId,
    supplierId, 
    showLowStockOnly = false 
  } = config;

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const {
    data: currentPage,
    isLoading,
    error,
    refetch: refetchCurrentPage
  } = useQuery({
    queryKey: [
      'items-infinite', 
      currentOffset, 
      pageSize, 
      searchTerm, 
      storeId, 
      categoryId,
      supplierId, 
      showLowStockOnly
    ],
    queryFn: async (): Promise<ItemsPage> => {
      const { data, error } = await supabase.rpc('search_items_enhanced', {
        search_term: searchTerm || null,
        store_id_filter: storeId && storeId !== 'all' ? storeId : null,
        category_id_filter: categoryId && categoryId !== 'all' ? categoryId : null,
        show_low_stock_only: showLowStockOnly,
        page_size: pageSize,
        page_offset: currentOffset
      });

      if (error) throw error;

      const items = data as Item[];
      // Note: total_count might need to be added to the database function
      const total = items.length > 0 ? (items[0] as any)?.total_count || items.length : 0;
      const nextOffset = currentOffset + pageSize;
      const hasMoreItems = nextOffset < total;

      return {
        items,
        nextCursor: hasMoreItems ? nextOffset : null,
        hasMore: hasMoreItems,
        totalCount: total
      };
    },
    enabled: hasMore || currentOffset === 0,
    staleTime: 30000, // 30 seconds
  });

  // Update accumulated items when new page is fetched
  useEffect(() => {
    if (currentPage) {
      if (currentOffset === 0) {
        // Reset for new search/filter
        setAllItems(currentPage.items);
      } else {
        // Append to existing items
        setAllItems(prev => [...prev, ...currentPage.items]);
      }
      setHasMore(currentPage.hasMore);
      setTotalCount(currentPage.totalCount);
    }
  }, [currentPage, currentOffset]);

  // Reset when search/filter parameters change
  useEffect(() => {
    setAllItems([]);
    setCurrentOffset(0);
    setHasMore(true);
  }, [searchTerm, storeId, categoryId, supplierId, showLowStockOnly]);

  const loadMore = useCallback(() => {
    if (currentPage && hasMore && !isLoading) {
      setCurrentOffset(prev => prev + pageSize);
    }
  }, [currentPage, hasMore, isLoading, pageSize]);

  const refresh = useCallback(async () => {
    setAllItems([]);
    setCurrentOffset(0);
    setHasMore(true);
    await refetchCurrentPage();
  }, [refetchCurrentPage]);

  const isInitialLoading = isLoading && currentOffset === 0;
  const isLoadingMore = isLoading && currentOffset > 0;

  return {
    items: allItems,
    isLoading: isInitialLoading,
    isLoadingMore,
    error,
    hasMore,
    totalCount,
    loadMore,
    refresh
  };
}