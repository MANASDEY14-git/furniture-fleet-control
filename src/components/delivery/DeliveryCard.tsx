import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Phone, MapPin, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/currencyUtils';
import { cn } from '@/lib/utils';
import moment from 'moment';
import type { DeliveryEvent } from '@/types/erp';

interface DeliveryCardProps {
  delivery: DeliveryEvent;
  isSelected?: boolean;
  onClick: () => void;
}

export default function DeliveryCard({ delivery, isSelected, onClick }: DeliveryCardProps) {
  const statusColors = {
    overdue: 'bg-destructive',
    today: 'bg-yellow-500',
    upcoming: 'bg-green-500',
    delivered: 'bg-blue-500',
  };

  const statusLabels = {
    overdue: 'Overdue',
    today: 'Today',
    upcoming: 'Upcoming',
    delivered: 'Delivered',
  };

  const statusBadgeVariants = {
    overdue: 'destructive' as const,
    today: 'default' as const,
    upcoming: 'secondary' as const,
    delivered: 'outline' as const,
  };

  return (
    <Card
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-150",
        "hover:shadow-md active:scale-[0.99]",
        "border-l-[3px]",
        isSelected && "ring-2 ring-primary shadow-md",
        delivery.status === 'delivered' && "opacity-60",
        // Status-based left border colors
        delivery.status === 'overdue' && "border-l-destructive",
        delivery.status === 'today' && "border-l-yellow-500",
        delivery.status === 'upcoming' && "border-l-green-500",
        delivery.status === 'delivered' && "border-l-blue-500"
      )}
    >
      {/* Compact card content - reduced padding */}
      <div className="px-2.5 py-2 md:px-3 md:py-2.5">
        {/* Row 1: Customer Name (left) + Balance Due (right, large, bold) */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={cn(
            "font-semibold text-foreground text-sm leading-tight truncate flex-1",
            delivery.status === 'delivered' && "line-through"
          )}>
            {delivery.customer_name}
          </h3>
          <span className={cn(
            "text-base font-bold shrink-0 tabular-nums",
            delivery.balance_due > 0 ? "text-destructive" : "text-primary"
          )}>
            {formatCurrency(delivery.balance_due)}
          </span>
        </div>

        {/* Row 2: Delivery date + status badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground font-medium">
            {moment(delivery.start).format('MMM D')}
          </span>
          <Badge 
            variant={statusBadgeVariants[delivery.status]} 
            className="h-5 px-1.5 text-[10px] gap-0.5"
          >
            {statusLabels[delivery.status]}
            {delivery.status === 'delivered' && <CheckCircle className="w-2.5 h-2.5" />}
          </Badge>
        </div>

        {/* Row 3: Address (single line, truncated) */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground/80 mb-0.5">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{delivery.customer_address || 'No address'}</span>
        </div>

        {/* Row 4: Phone (tertiary - lighter) */}
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
          <Phone className="w-2.5 h-2.5 shrink-0" />
          <span>{delivery.customer_phone}</span>
        </div>
      </div>
    </Card>
  );
}
