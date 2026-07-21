import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Truck, Calendar, ChevronRight, Clock } from 'lucide-react';
import { useSalePaymentStatus } from '@/hooks/useSalePaymentStatus';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/currencyUtils';

export default function DeliveryAlertsCard() {
  const navigate = useNavigate();
  const { data: salePaymentStatus = [], isLoading } = useSalePaymentStatus();

  const deliveryStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const overdue: typeof salePaymentStatus = [];
    const todayDeliveries: typeof salePaymentStatus = [];
    const upcoming: typeof salePaymentStatus = [];

    salePaymentStatus.forEach((sale) => {
      if (!sale.delivery_date || sale.delivery_status?.toLowerCase() === 'delivered') return;
      
      const deliveryDate = new Date(sale.delivery_date);
      deliveryDate.setHours(0, 0, 0, 0);

      if (deliveryDate < today) {
        overdue.push(sale);
      } else if (deliveryDate.getTime() === today.getTime()) {
        todayDeliveries.push(sale);
      } else if (deliveryDate < tomorrow) {
        upcoming.push(sale);
      }
    });

    const overdueTotal = overdue.reduce((sum, s) => sum + (s.total_price || 0), 0);
    const todayTotal = todayDeliveries.reduce((sum, s) => sum + (s.total_price || 0), 0);

    return {
      overdue,
      overdueCount: overdue.length,
      overdueTotal,
      todayDeliveries,
      todayCount: todayDeliveries.length,
      todayTotal,
      upcomingCount: upcoming.length,
    };
  }, [salePaymentStatus]);

  const hasAlerts = deliveryStats.overdueCount > 0 || deliveryStats.todayCount > 0;

  if (isLoading) {
    return (
      <Card className="simple-card animate-pulse">
        <CardContent className="p-6">
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!hasAlerts) {
    return (
      <Card className="simple-card border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <Truck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">All Deliveries On Track</p>
              <p className="text-sm text-muted-foreground">No overdue or pending deliveries for today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'simple-card overflow-hidden',
      deliveryStats.overdueCount > 0 && 'border-destructive/30 bg-destructive/5'
    )}>
      <CardContent className="p-0">
        {/* Overdue Section */}
        {deliveryStats.overdueCount > 0 && (
          <div className="p-4 border-b bg-destructive/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-destructive">
                      {deliveryStats.overdueCount} Overdue Deliver{deliveryStats.overdueCount > 1 ? 'ies' : 'y'}
                    </span>
                    <Badge variant="destructive" className="text-xs">
                      Action Required
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total value: {formatCurrency(deliveryStats.overdueTotal)}
                  </p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => navigate('/delivery-calendar')}
                className="shrink-0"
              >
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            {/* Show first 3 overdue deliveries */}
            {deliveryStats.overdueCount > 0 && (
              <div className="mt-3 space-y-2">
                {deliveryStats.overdue.slice(0, 3).map((delivery) => (
                  <div 
                    key={delivery.sale_id}
                    className="flex items-center justify-between bg-background/50 rounded-md px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <span className="font-medium truncate">{delivery.customer_name || 'Unknown'}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground text-xs">{delivery.order_number}</span>
                    </div>
                    <span className="font-semibold text-destructive shrink-0">
                      {formatCurrency(delivery.total_price || 0)}
                    </span>
                  </div>
                ))}
                {deliveryStats.overdueCount > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{deliveryStats.overdueCount - 3} more overdue
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Today's Deliveries Section */}
        {deliveryStats.todayCount > 0 && (
          <div className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {deliveryStats.todayCount} Deliver{deliveryStats.todayCount > 1 ? 'ies' : 'y'} Today
                    </span>
                    <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">
                      Scheduled
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Total value: {formatCurrency(deliveryStats.todayTotal)}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/delivery-calendar')}
                className="shrink-0"
              >
                Manage
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            {/* Show first 2 today's deliveries */}
            {deliveryStats.todayCount > 0 && (
              <div className="mt-3 space-y-2">
                {deliveryStats.todayDeliveries.slice(0, 2).map((delivery) => (
                  <div 
                    key={delivery.sale_id}
                    className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-medium truncate">{delivery.customer_name || 'Unknown'}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground text-xs">{delivery.order_number}</span>
                    </div>
                    <span className="font-semibold shrink-0">
                      {formatCurrency(delivery.total_price || 0)}
                    </span>
                  </div>
                ))}
                {deliveryStats.todayCount > 2 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{deliveryStats.todayCount - 2} more today
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
