
import { useState, useMemo } from 'react';
import moment from 'moment';
import { Card, CardContent } from '@/components/ui/card';
import { useSalePaymentStatus, useUpdateDeliveryDate } from '@/hooks/useSalePaymentStatus';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { useStores } from '@/hooks/useStores';
import CalendarHeader from './delivery/CalendarHeader';
import CalendarView from './delivery/CalendarView';
import EventDetailsDialog from './delivery/EventDetailsDialog';
import { transformSalesDataToEvents } from './delivery/calendarUtils';
import type { DeliveryEvent } from '@/types/erp';

export default function DeliveryCalendar() {
  const [selectedEvent, setSelectedEvent] = useState<DeliveryEvent | null>(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');

  const { data: salePaymentStatus = [] } = useSalePaymentStatus();
  const { data: salesOrders = [] } = useSalesOrders();
  const { data: stores = [] } = useStores();
  const updateDeliveryDate = useUpdateDeliveryDate();

  const deliveryEvents = useMemo(() => {
    return transformSalesDataToEvents(salePaymentStatus, stores, salesOrders);
  }, [salePaymentStatus, stores, salesOrders]);

  const handleSelectEvent = (event: DeliveryEvent) => {
    setSelectedEvent(event);
    setNewDeliveryDate(moment(event.start).format('YYYY-MM-DD'));
  };

  const handleUpdateDeliveryDate = async () => {
    if (selectedEvent && newDeliveryDate) {
      await updateDeliveryDate.mutateAsync({
        saleId: selectedEvent.id,
        deliveryDate: newDeliveryDate,
      });
      setSelectedEvent(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="simple-card">
        <CalendarHeader />
        <CardContent>
          <CalendarView
            events={deliveryEvents}
            onSelectEvent={handleSelectEvent}
          />
        </CardContent>
      </Card>

      <EventDetailsDialog
        selectedEvent={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        newDeliveryDate={newDeliveryDate}
        onDeliveryDateChange={setNewDeliveryDate}
        onUpdateDeliveryDate={handleUpdateDeliveryDate}
        isUpdating={updateDeliveryDate.isPending}
      />
    </div>
  );
}
