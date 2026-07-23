
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currencyUtils';
import { useIsMobile } from '@/hooks/use-mobile';

interface SalesMetricsGridProps {
  filteredOrders: any[];
}

export default function SalesMetricsGrid({ filteredOrders }: SalesMetricsGridProps) {
  const isMobile = useIsMobile();

  // Exclude cancelled orders entirely so their revenue, partial payments,
  // and outstanding balances don't distort the KPIs.
  const activeOrders = filteredOrders.filter((order) => {
    const status = (order.delivery_status || '').toString().toLowerCase();
    return status !== 'cancelled';
  });

  const totalRevenue = activeOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const totalCollected = activeOrders.reduce((sum, o) => sum + Number(o.total_paid || 0), 0);
  const totalOutstanding = activeOrders.reduce((sum, o) => sum + Number(o.balance_due || 0), 0);

  const metrics = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), color: "text-foreground" },
    { label: "Total Collected", value: formatCurrency(totalCollected), color: "text-green-600" },
    { label: "Outstanding", value: formatCurrency(totalOutstanding), color: "text-amber-600" },
  ];

  return (
    <div className={isMobile ? "grid grid-cols-3 gap-3" : "grid grid-cols-1 sm:grid-cols-3 gap-4"}>
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className={isMobile ? "p-4" : "pt-6"}>
            <div className="text-center">
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mb-1`}>{metric.label}</p>
              <p className={`${isMobile ? 'text-base' : 'text-2xl'} font-bold ${metric.color}`}>
                {metric.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
