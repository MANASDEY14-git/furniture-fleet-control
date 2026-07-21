import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { eventStyleGetter } from './calendarUtils';
import type { DeliveryEvent } from '@/types/erp';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface DeliveryCalendarViewProps {
  events: DeliveryEvent[];
  onSelectEvent: (event: DeliveryEvent) => void;
}

export default function DeliveryCalendarView({ events, onSelectEvent }: DeliveryCalendarViewProps) {
  return (
    <div className="h-[calc(100vh-280px)] min-h-[500px] bg-card rounded-lg p-4 border border-border">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={onSelectEvent}
        views={['month', 'week', 'day']}
        defaultView="month"
        popup
        className="delivery-calendar"
      />
    </div>
  );
}
