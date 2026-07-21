import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUpdateSalesOrderStatus } from '@/hooks/useSalesOrders';
import { useCanAccessCustomerPII } from '@/hooks/useSecureSalesOrders';
import { useRecordPayment } from '@/hooks/useSalePaymentStatus';
import { useComputedSalePaymentStatus } from '@/hooks/useComputedSalePaymentStatus';
import { useStoreContext } from '@/contexts/StoreContext';
import { useSuppliers } from '@/hooks/useSuppliers';
import { DeliveryStatus } from '@/types';
import type { DateFilter } from '@/hooks/useEnhancedDashboardMetrics';
import SalesHeader from '@/components/sales/SalesHeader';
import SalesMetricsGrid from '@/components/sales/SalesMetricsGrid';
import SalesFilters from '@/components/sales/SalesFilters';
import SalesTable from '@/components/sales/SalesTable';
import OrderDetailsDialog from '@/components/sales/OrderDetailsDialog';
import PaymentRecordDialog from '@/components/sales/PaymentRecordDialog';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Sales() {
  const isMobile = useIsMobile();
  const { activeStoreId, accessibleStores } = useStoreContext();
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [recordingPayment, setRecordingPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [documentType, setDocumentType] = useState<'order' | 'quote'>('order');

  // Use computed sale payment status that works with secure orders
  const { data: salePaymentStatus = [], isLoading: ordersLoading, refetch: refetchSalePaymentStatus } = useComputedSalePaymentStatus(activeStoreId === 'all' ? undefined : activeStoreId, documentType);
  const { data: suppliers = [] } = useSuppliers();
  const { data: canAccessPII = false } = useCanAccessCustomerPII();
  const updateOrderStatus = useUpdateSalesOrderStatus();
  const recordPayment = useRecordPayment();

  // Query to get order IDs that have items from selected supplier
  const { data: orderItemSuppliers = [] } = useQuery({
    queryKey: ['sales-order-item-suppliers', selectedSupplier],
    queryFn: async () => {
      if (selectedSupplier === 'all') return [];
      
      const { data, error } = await supabase
        .from('sales_order_items')
        .select('order_id, supplier_id')
        .eq('supplier_id', selectedSupplier);
      
      if (error) throw error;
      return data || [];
    },
    enabled: selectedSupplier !== 'all'
  });

  // Set up real-time subscriptions
  useEffect(() => {
    const channels: any[] = [];

    // Subscribe to sales_orders changes
    const salesOrdersChannel = supabase
      .channel('sales-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_orders'
        },
        () => {
          console.log('Sales orders changed, refreshing...');
          refetchSalePaymentStatus();
        }
      )
      .subscribe();
    channels.push(salesOrdersChannel);

    // Subscribe to payments changes
    const paymentsChannel = supabase
      .channel('sales-payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          console.log('Payments changed, refreshing sales...');
          refetchSalePaymentStatus();
        }
      )
      .subscribe();
    channels.push(paymentsChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [refetchSalePaymentStatus]);

  const filteredOrders = useMemo(() => {
    // Get set of order IDs that have items from selected supplier
    const orderIdsWithSupplierItems = new Set(
      orderItemSuppliers.map(item => item.order_id)
    );

    // Use sale payment status data for enhanced information
    let filtered = salePaymentStatus.filter(order => {
      const matchesStore = activeStoreId === 'all' || order.store_id === activeStoreId;
      
      // Supplier filter: check BOTH order-level supplier AND item-level suppliers
      let matchesSupplier = selectedSupplier === 'all';
      if (!matchesSupplier) {
        // Match if order has the supplier at order level OR has items from that supplier
        matchesSupplier = order.supplier_id === selectedSupplier || 
                         orderIdsWithSupplierItems.has(order.sale_id);
      }
      
      const matchesSearch = searchTerm === '' || 
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesStore && matchesSupplier && matchesSearch;
    });

    // Apply date filter
    if (dateFilter !== 'month' || customDateRange) {
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'custom':
          if (!customDateRange) return filtered;
          startDate = customDateRange.from;
          endDate = customDateRange.to;
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.sale_date);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    // Sort by sale_date (most recent first) - salePaymentStatus already has this data
    filtered.sort((a, b) => {
      const dateA = new Date(a.sale_date);
      const dateB = new Date(b.sale_date);
      return dateB.getTime() - dateA.getTime();
    });

    return filtered;
  }, [salePaymentStatus, activeStoreId, selectedSupplier, searchTerm, dateFilter, customDateRange, orderItemSuppliers]);

  const getStoreName = (storeId: string) => {
    return accessibleStores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Walk-in Customer';
  };

  const handleStatusUpdate = (orderId: string, newStatus: DeliveryStatus) => {
    updateOrderStatus.mutate({ id: orderId, delivery_status: newStatus });
  };

  const handleRecordPayment = async () => {
    if (!recordingPayment || !paymentAmount) return;
    
    const description = paymentDescription.trim() || `Payment for order ${recordingPayment.order_number}`;
    
    await recordPayment.mutateAsync({
      sale_id: recordingPayment.sale_id,
      amount: parseFloat(paymentAmount),
      date: new Date().toISOString().split('T')[0],
      description: description,
      store_id: recordingPayment.store_id,
      order_description: recordingPayment.description,
    });
    
    setRecordingPayment(null);
    setPaymentAmount('');
    setPaymentDescription('');
  };

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading sales orders...</div>
      </div>
    );
  }

  const content = (
    <div className="space-y-8">
      <SalesHeader 
        filteredOrders={filteredOrders}
        dateFilter={dateFilter}
        getStoreName={getStoreName}
        getSupplierName={getSupplierName}
        documentType={documentType}
      />

      <Tabs value={documentType} onValueChange={(v) => setDocumentType(v as 'order' | 'quote')} className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="order">Orders</TabsTrigger>
          <TabsTrigger value="quote">Quotes</TabsTrigger>
        </TabsList>
      </Tabs>

      {documentType === 'order' && <SalesMetricsGrid filteredOrders={filteredOrders} />}

      <SalesFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedSupplier={selectedSupplier}
        setSelectedSupplier={setSelectedSupplier}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customDateRange={customDateRange}
        setCustomDateRange={setCustomDateRange}
      />

      <SalesTable
        filteredOrders={filteredOrders}
        getStoreName={getStoreName}
        getSupplierName={getSupplierName}
        handleStatusUpdate={handleStatusUpdate}
        setViewingOrder={setViewingOrder}
        setRecordingPayment={setRecordingPayment}
        canAccessPII={canAccessPII}
        documentType={documentType}
        onConvertSuccess={() => setDocumentType('order')}
      />

      <OrderDetailsDialog
        viewingOrder={viewingOrder}
        setViewingOrder={setViewingOrder}
        getStoreName={getStoreName}
        canAccessPII={canAccessPII}
      />

      <PaymentRecordDialog
        recordingPayment={recordingPayment}
        setRecordingPayment={setRecordingPayment}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentDescription={paymentDescription}
        setPaymentDescription={setPaymentDescription}
        handleRecordPayment={handleRecordPayment}
        isRecordingPayment={recordPayment.isPending}
      />
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={async () => { await refetchSalePaymentStatus(); }}>
        {content}
      </PullToRefresh>
    );
  }

  return content;
}
