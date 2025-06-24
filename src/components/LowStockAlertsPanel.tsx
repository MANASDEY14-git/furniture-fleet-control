
import React from 'react';
import { AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLowStockAlerts, useResolveLowStockAlert } from '@/hooks/useLowStockAlerts';

export default function LowStockAlertsPanel() {
  const { data: alerts = [], isLoading } = useLowStockAlerts();
  const resolveAlert = useResolveLowStockAlert();

  const handleResolveAlert = (id: string) => {
    resolveAlert.mutate(id);
  };

  if (isLoading) {
    return (
      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-300 glow-text">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-300">Loading alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-300 glow-text">
          <AlertTriangle className="h-5 w-5 text-orange-400" />
          Low Stock Alerts
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <p className="text-blue-300">No low stock alerts</p>
            <p className="text-blue-400 text-sm">All items are well stocked</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-orange-900/20 rounded-lg border border-orange-500/30">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className="font-medium text-blue-100">{alert.item_name}</p>
                    <p className="text-sm text-blue-300">
                      Only {alert.current_quantity} left (threshold: {alert.threshold_quantity})
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResolveAlert(alert.id)}
                  disabled={resolveAlert.isPending}
                  className="text-green-400 border-green-400/50 hover:bg-green-900/20"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
