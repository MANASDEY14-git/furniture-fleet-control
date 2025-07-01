
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currencyUtils';

interface SalesMetricsGridProps {
  filteredOrders: any[];
}

export default function SalesMetricsGrid({ filteredOrders }: SalesMetricsGridProps) {
  const getTotalRevenue = () => {
    return filteredOrders.reduce((sum, order) => sum + order.total_price, 0);
  };

  const getTotalPaid = () => {
    return filteredOrders.reduce((sum, order) => sum + order.total_paid, 0);
  };

  const getTotalOutstanding = () => {
    return filteredOrders.reduce((sum, order) => sum + order.balance_due, 0);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-blue-200 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-cyan-300">
              {filteredOrders.length}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-blue-200 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-cyan-300">
              {formatCurrency(getTotalRevenue())}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-blue-200 mb-1">Total Collected</p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(getTotalPaid())}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="futuristic-card">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-blue-200 mb-1">Outstanding</p>
            <p className="text-2xl font-bold text-orange-400">
              {formatCurrency(getTotalOutstanding())}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
