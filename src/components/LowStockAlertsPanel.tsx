
import React from 'react';
import { AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLowStockAlerts, useResolveLowStockAlert } from '@/hooks/useLowStockAlerts';
import { useIsMobile } from '@/hooks/use-mobile';

export default function LowStockAlertsPanel() {
  const { data: alerts = [], isLoading } = useLowStockAlerts();
  const resolveAlert = useResolveLowStockAlert();
  const isMobile = useIsMobile();

  const handleResolveAlert = (id: string) => {
    resolveAlert.mutate(id);
  };

  if (isLoading) {
    return (
      <Card className="simple-card">
        <CardHeader className={isMobile ? 'pb-3' : ''}>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? 'pt-0' : ''}>
          <p className="text-muted-foreground">Loading alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="simple-card">
      <CardHeader className={isMobile ? 'pb-3' : ''}>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <AlertTriangle className="h-5 w-5" />
          Low Stock Alerts
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'pt-0 space-y-3' : 'space-y-4'}`}>
        {alerts.length === 0 ? (
          <div className={`text-center ${isMobile ? 'py-4' : 'py-8'}`}>
            <CheckCircle className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} text-green-600 mx-auto mb-2`} />
            <p className="text-foreground font-medium">No low stock alerts</p>
            <p className="text-muted-foreground text-sm">All items are well stocked</p>
          </div>
        ) : (
          <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
            {alerts.map((alert) => (
              <div key={alert.id} className={`flex items-center justify-between ${isMobile ? 'p-3' : 'p-4'} bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800/30`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Package className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{alert.item_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Only {alert.current_quantity} left (threshold: {alert.threshold_quantity})
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "sm"}
                  onClick={() => handleResolveAlert(alert.id)}
                  disabled={resolveAlert.isPending}
                  className="text-green-600 border-green-600/50 hover:bg-green-50 dark:hover:bg-green-950/20 flex-shrink-0 ml-2"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {isMobile ? '' : 'Resolve'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
