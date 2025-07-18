import { useState, useMemo, useEffect } from 'react';
import { useSalesOrders, useUpdateSalesOrderStatus } from '@/hooks/useSalesOrders';
import { useSalePaymentStatus, useRecordPayment } from '@/hooks/useSalePaymentStatus';
import { useStores } from '@/hooks/useStores';
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

export default function Sales() {
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [recordingPayment, setRecordingPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);

  const { data: salesOrders = [], isLoading: ordersLoading, refetch: refetchSalesOrders } = useSalesOrders();
  const { data: salePaymentStatus = [], refetch: refetchSalePaymentStatus } = useSalePaymentStatus();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const updateOrderStatus = useUpdateSalesOrderStatus();
  const recordPayment = useRecordPayment();

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
          refetchSalesOrders();
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
  }, [refetchSalesOrders, refetchSalePaymentStatus]);

  const filteredOrders = useMemo(() => {
    // Use sale payment status data for enhanced information
    let filtered = salePaymentStatus.filter(order => {
      const matchesStore = selectedStore === 'all' || order.store_id === selectedStore;
      const matchesSupplier = selectedSupplier === 'all' || order.supplier_id === selectedSupplier;
      const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
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

    return filtered;
  }, [salePaymentStatus, selectedStore, selectedSupplier, searchTerm, dateFilter, customDateRange]);

  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(supplier => supplier.id === supplierId)?.name || 'Walk-in Customer';
  };

  const handleStatusUpdate = (orderId: string, newStatus: DeliveryStatus) => {
    updateOrderStatus.mutate({ id: orderId, delivery_status: newStatus });
  };

  const handleRecordPayment = async () => {
    if (!recordingPayment || !paymentAmount) return;
    
    await recordPayment.mutateAsync({
      sale_id: recordingPayment.sale_id,
      amount: parseFloat(paymentAmount),
      date: new Date().toISOString().split('T')[0],
      description: `Payment for order ${recordingPayment.order_number}`,
      store_id: recordingPayment.store_id,
    });
    
    setRecordingPayment(null);
    setPaymentAmount('');
  };

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg glow-text">Loading sales orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SalesHeader 
        filteredOrders={filteredOrders}
        dateFilter={dateFilter}
        getStoreName={getStoreName}
        getSupplierName={getSupplierName}
      />

      <SalesMetricsGrid filteredOrders={filteredOrders} />

      <SalesFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedStore={selectedStore}
        setSelectedStore={setSelectedStore}
        selectedSupplier={selectedSupplier}
        setSelectedSupplier={setSelectedSupplier}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customDateRange={customDateRange}
        setCustomDateRange={setCustomDateRange}
        stores={stores}
        storesLoading={storesLoading}
      />

      <SalesTable
        filteredOrders={filteredOrders}
        getStoreName={getStoreName}
        getSupplierName={getSupplierName}
        handleStatusUpdate={handleStatusUpdate}
        setViewingOrder={setViewingOrder}
        setRecordingPayment={setRecordingPayment}
      />

      <OrderDetailsDialog
        viewingOrder={viewingOrder}
        setViewingOrder={setViewingOrder}
        getStoreName={getStoreName}
      />

      <PaymentRecordDialog
        recordingPayment={recordingPayment}
        setRecordingPayment={setRecordingPayment}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        handleRecordPayment={handleRecordPayment}
        isRecordingPayment={recordPayment.isPending}
      />
    </div>
  );
}
