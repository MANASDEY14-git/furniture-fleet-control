
import DeliveryCalendar from '@/components/DeliveryCalendar';

export default function DeliveryCalendarPage({
  hideHeader = false
}: {
  hideHeader?: boolean;
}) {
  return <DeliveryCalendar hideHeader={hideHeader} />;
}
