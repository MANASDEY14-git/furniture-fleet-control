
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { eventStyleGetter } from './calendarUtils';
import type { DeliveryEvent } from '@/types/erp';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  events: DeliveryEvent[];
  onSelectEvent: (event: DeliveryEvent) => void;
}

export default function CalendarView({ events, onSelectEvent }: CalendarViewProps) {
  return (
    <div className="h-[600px] bg-slate-900/50 rounded-lg p-4">
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
