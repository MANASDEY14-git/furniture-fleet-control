
import { useState, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Phone, MapPin, Package } from 'lucide-react';
import { useSalePaymentStatus, useUpdateDeliveryDate } from '@/hooks/useSalePaymentStatus';
import { useStores } from '@/hooks/useStores';
import { formatCurrency } from '@/utils/currencyUtils';
import type { DeliveryEvent } from '@/types/erp';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export default function DeliveryCalendar() {
  const [selectedEvent, setSelectedEvent] = useState<DeliveryEvent | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');

  const { data: salePaymentStatus = [] } = useSalePaymentStatus();
  const { data: stores = [] } = useStores();
  const updateDeliveryDate = useUpdateDeliveryDate();

  const deliveryEvents = useMemo(() => {
    return salePaymentStatus
      .filter(sale => sale.delivery_date)
      .map(sale => {
        const deliveryDate = new Date(sale.delivery_date!);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let status: 'overdue' | 'today' | 'upcoming' = 'upcoming';
        if (deliveryDate < today) {
          status = 'overdue';
        } else if (deliveryDate.toDateString() === today.toDateString()) {
          status = 'today';
        }

        const store = stores.find(s => s.id === sale.store_id);
        
        return {
          id: sale.sale_id,
          title: `${sale.customer_name || 'Customer'} - ${sale.order_number}`,
          start: deliveryDate,
          end: deliveryDate,
          customer_name: sale.customer_name || 'Walk-in Customer',
          customer_phone: sale.customer_phone || 'N/A',
          customer_address: sale.customer_address || 'N/A',
          items: [], // Will be populated from sales_order_items if needed
          store_name: store?.name || 'Unknown Store',
          balance_due: sale.balance_due,
          status,
        } as DeliveryEvent;
      });
  }, [salePaymentStatus, stores]);

  const eventStyleGetter = (event: DeliveryEvent) => {
    let backgroundColor = '#10b981'; // green for upcoming
    
    if (event.status === 'overdue') {
      backgroundColor = '#ef4444'; // red for overdue
    } else if (event.status === 'today') {
      backgroundColor = '#f59e0b'; // yellow for today
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '12px',
        padding: '2px 4px',
      },
    };
  };

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
      setShowEditDialog(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      overdue: 'destructive',
      today: 'default',
      upcoming: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status === 'overdue' ? 'Overdue' : status === 'today' ? 'Today' : 'Upcoming'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            Delivery Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] bg-slate-900/50 rounded-lg p-4">
            <Calendar
              localizer={localizer}
              events={deliveryEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              views={['month', 'week', 'day']}
              defaultView="month"
              popup
              className="delivery-calendar"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="futuristic-card max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-cyan-300">Delivery Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-blue-100">
                  {selectedEvent.title}
                </h3>
                {getStatusBadge(selectedEvent.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-200">
                    <Phone className="w-4 h-4" />
                    <span>{selectedEvent.customer_phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-blue-200">
                    <MapPin className="w-4 h-4 mt-1" />
                    <span>{selectedEvent.customer_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-200">
                    <Package className="w-4 h-4" />
                    <span>Store: {selectedEvent.store_name}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-blue-200">
                    <span className="font-semibold">Delivery Date:</span>
                    <span className="ml-2">{moment(selectedEvent.start).format('MMMM Do, YYYY')}</span>
                  </div>
                  <div className="text-blue-200">
                    <span className="font-semibold">Balance Due:</span>
                    <span className="ml-2 text-orange-400 font-bold">
                      {formatCurrency(selectedEvent.balance_due)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-blue-500/30 pt-4">
                <h4 className="text-blue-200 font-semibold mb-2">Update Delivery Date</h4>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className="neon-border bg-slate-800/50 text-blue-100"
                  />
                  <Button
                    onClick={handleUpdateDeliveryDate}
                    disabled={updateDeliveryDate.isPending}
                    className="cyber-button text-white"
                  >
                    {updateDeliveryDate.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
