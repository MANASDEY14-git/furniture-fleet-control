
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function CalendarHeader() {
  return (
    <CardHeader>
      <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
        <CalendarIcon className="w-6 h-6" />
        Delivery Calendar
      </CardTitle>
    </CardHeader>
  );
}
