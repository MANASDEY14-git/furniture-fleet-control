import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFinancialYear } from '@/contexts/FinancialYearContext';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';

interface PaginatedSalesOrdersConfig {
  pageSize?: number;
  searchTerm?: string;
  storeId?: string;
  supplierId?: string;
  dateFilter?: DateFilter;
  customDateRange?: { from: Date; to: Date } | null;
}

export const usePaginatedSalesOrders = (config: PaginatedSalesOrdersConfig = {}) => {
  const {
    pageSize = 50,
    searchTerm = '',
    storeId = 'all',
    supplierId = 'all',
    dateFilter,
    customDateRange
  } = config;

  const { selectedYear } = useFinancialYear();
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: ordersData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [
      'sales-orders-paginated',
      currentPage,
      pageSize,
      searchTerm,
      storeId,
      supplierId,
      dateFilter,
      customDateRange,
      selectedYear?.id,
    ],
    enabled: !!selectedYear,
    queryFn: async () => {
      let query = supabase
        .from('sale_payment_status')
        .select('*', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('order_number', `%${searchTerm}%`);
      }
      if (storeId && storeId !== 'all') {
        query = query.eq('store_id', storeId);
      }
      if (supplierId && supplierId !== 'all') {
        query = query.eq('supplier_id', supplierId);
      }

      // Determine date bounds. Explicit dateFilter takes priority; otherwise scope to FY.
      let startDateStr: string | null = null;
      let endDateStr: string | null = null;

      if (dateFilter) {
        const now = new Date();
        let start: Date | null = null;
        let end: Date = now;
        switch (dateFilter) {
          case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'custom':
            if (customDateRange) {
              start = customDateRange.from;
              end = customDateRange.to;
            }
            break;
        }
        if (start) {
          startDateStr = start.toISOString().split('T')[0];
          endDateStr = end.toISOString().split('T')[0];
        }
      }

      // Fall back to the selected financial year window.
      if (!startDateStr && selectedYear) {
        startDateStr = selectedYear.start_date;
        endDateStr = selectedYear.end_date;
      }

      if (startDateStr && endDateStr) {
        query = query.gte('sale_date', startDateStr).lte('sale_date', endDateStr);
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .range(from, to)
        .order('sale_date', { ascending: false });

      if (error) throw error;

      return {
        orders: data || [],
        totalCount: count || 0,
        hasMore: (count || 0) > currentPage * pageSize,
        currentPage,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const paginationInfo = useMemo(() => {
    if (!ordersData) return null;
    
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, ordersData.totalCount);
    
    return {
      startItem,
      endItem,
      totalItems: ordersData.totalCount,
      currentPage,
      totalPages: ordersData.totalPages,
      hasNext: currentPage < ordersData.totalPages,
      hasPrevious: currentPage > 1
    };
  }, [ordersData, currentPage, pageSize]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (ordersData?.totalPages || 1)) {
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
    orders: ordersData?.orders || [],
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