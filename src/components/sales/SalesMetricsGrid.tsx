
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currencyUtils';
import { useIsMobile } from '@/hooks/use-mobile';

interface SalesMetricsGridProps {
  filteredOrders: any[];
}

export default function SalesMetricsGrid({ filteredOrders }: SalesMetricsGridProps) {
  const isMobile = useIsMobile();

  const getTotalRevenue = () => {
    return filteredOrders.reduce((sum, order) => sum + order.total_price, 0);
  };

  const getTotalPaid = () => {
    return filteredOrders.reduce((sum, order) => sum + order.total_paid, 0);
  };

  const getTotalOutstanding = () => {
    return filteredOrders.reduce((sum, order) => sum + order.balance_due, 0);
  };

  const metrics = [
    {
      label: "Total Orders",
      value: filteredOrders.length.toString(),
      color: "text-cyan-300"
    },
    {
      label: "Total Revenue", 
      value: formatCurrency(getTotalRevenue()),
      color: "text-cyan-300"
    },
    {
      label: "Total Collected",
      value: formatCurrency(getTotalPaid()),
      color: "text-green-400"
    },
    {
      label: "Outstanding",
      value: formatCurrency(getTotalOutstanding()),
      color: "text-orange-400"
    }
  ];

  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Top row - primary metrics */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.slice(0, 2).map((metric, index) => (
            <Card key={index} className="futuristic-card">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs text-blue-200 mb-1">{metric.label}</p>
                  <p className={`text-lg font-bold ${metric.color}`}>
                    {metric.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Bottom row - financial metrics */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.slice(2).map((metric, index) => (
            <Card key={index + 2} className="futuristic-card">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs text-blue-200 mb-1">{metric.label}</p>
                  <p className={`text-lg font-bold ${metric.color}`}>
                    {metric.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="futuristic-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-200 mb-1">{metric.label}</p>
              <p className={`text-2xl font-bold ${metric.color}`}>
                {metric.value}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
