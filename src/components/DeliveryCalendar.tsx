import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { List, CalendarDays, Plus, Truck } from 'lucide-react';
import { useSalePaymentStatus } from '@/hooks/useSalePaymentStatus';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { useStores } from '@/hooks/useStores';
import { useIsMobile } from '@/hooks/use-mobile';
import DeliveryTabs, { type DeliveryTab } from './delivery/DeliveryTabs';
import DeliveryList from './delivery/DeliveryList';
import DeliveryDetailPanel from './delivery/DeliveryDetailPanel';
import DeliveryBottomSheet from './delivery/DeliveryBottomSheet';
import DeliveryCalendarView from './delivery/DeliveryCalendarView';
import { transformSalesDataToEvents } from './delivery/calendarUtils';
import type { DeliveryEvent } from '@/types/erp';

export default function DeliveryCalendar() {
  const isMobile = useIsMobile();
  
  // State
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [activeTab, setActiveTab] = useState<DeliveryTab>('today');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const { data: salePaymentStatus = [], isLoading: loadingPayments } = useSalePaymentStatus();
  const { data: salesOrders = [], isLoading: loadingOrders } = useSalesOrders();
  const { data: stores = [] } = useStores();

  const isLoading = loadingPayments || loadingOrders;

  // Transform data to delivery events
  const deliveryEvents = useMemo(() => {
    return transformSalesDataToEvents(salePaymentStatus, stores, salesOrders);
  }, [salePaymentStatus, stores, salesOrders]);

  // Count deliveries by status
  const counts = useMemo(() => {
    return {
      today: deliveryEvents.filter(d => d.status === 'today').length,
      upcoming: deliveryEvents.filter(d => d.status === 'upcoming').length,
      overdue: deliveryEvents.filter(d => d.status === 'overdue').length,
      delivered: deliveryEvents.filter(d => d.status === 'delivered').length,
    };
  }, [deliveryEvents]);

  // Get filtered deliveries for current tab
  const filteredDeliveries = useMemo(() => {
    return deliveryEvents.filter(d => d.status === activeTab);
  }, [deliveryEvents, activeTab]);

  // Get selected delivery object
  const selectedDelivery = useMemo(() => {
    return deliveryEvents.find(d => d.id === selectedDeliveryId) || null;
  }, [deliveryEvents, selectedDeliveryId]);

  // Navigation logic for swipe between deliveries
  const currentIndex = useMemo(() => {
    if (!selectedDeliveryId) return -1;
    return filteredDeliveries.findIndex(d => d.id === selectedDeliveryId);
  }, [filteredDeliveries, selectedDeliveryId]);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    if (currentIndex === -1) return;
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < filteredDeliveries.length) {
      setSelectedDeliveryId(filteredDeliveries[newIndex].id);
    }
  }, [currentIndex, filteredDeliveries]);

  // Auto-select first delivery on desktop when tab changes
  useEffect(() => {
    if (!isMobile && filteredDeliveries.length > 0 && !selectedDeliveryId) {
      setSelectedDeliveryId(filteredDeliveries[0].id);
    }
  }, [isMobile, filteredDeliveries, selectedDeliveryId]);

  // Handle delivery selection
  const handleSelectDelivery = useCallback((id: string) => {
    setSelectedDeliveryId(id);
  }, []);

  // Handle calendar event click
  const handleCalendarEventClick = useCallback((event: DeliveryEvent) => {
    setActiveTab(event.status as DeliveryTab);
    setSelectedDeliveryId(event.id);
    if (isMobile) {
      setViewMode('list');
    }
  }, [isMobile]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
      {/* Unified Sticky Header (Mobile: merged header+tabs+search) */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        {/* Title + View Toggle Row */}
        <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <h1 className="text-base md:text-xl font-semibold text-foreground">Deliveries</h1>
          </div>
          
          {/* View Toggle */}
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(v) => v && setViewMode(v as 'list' | 'calendar')}
            className="bg-muted/50 p-0.5 rounded-md"
          >
            <ToggleGroupItem value="list" aria-label="List view" className="h-7 w-7 md:h-8 md:w-auto md:px-3 data-[state=on]:bg-background">
              <List className="w-4 h-4" />
              <span className="hidden md:inline text-sm ml-1.5">List</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendar view" className="h-7 w-7 md:h-8 md:w-auto md:px-3 data-[state=on]:bg-background">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden md:inline text-sm ml-1.5">Calendar</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Tabs Row */}
        <div className="px-3 pb-2 md:px-4">
          <DeliveryTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={counts}
          />
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'calendar' ? (
        <div className="flex-1 p-4 overflow-auto">
          <DeliveryCalendarView
            events={deliveryEvents}
            onSelectEvent={handleCalendarEventClick}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* List Section */}
          <div className={`${isMobile ? 'w-full' : 'w-[35%] border-r border-border'} flex flex-col`}>
            <DeliveryList
              deliveries={deliveryEvents}
              isLoading={isLoading}
              activeTab={activeTab}
              selectedId={selectedDeliveryId}
              onSelect={handleSelectDelivery}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Desktop Detail Panel */}
          {!isMobile && (
            <div className="w-[65%] flex flex-col">
              <DeliveryDetailPanel
                delivery={selectedDelivery}
                onNavigate={handleNavigate}
                hasPrev={currentIndex > 0}
                hasNext={currentIndex < filteredDeliveries.length - 1}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {isMobile && (
        <DeliveryBottomSheet
          delivery={selectedDelivery}
          isOpen={!!selectedDeliveryId}
          onClose={() => setSelectedDeliveryId(null)}
          onNavigate={handleNavigate}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < filteredDeliveries.length - 1}
        />
      )}
    </div>
  );
}
