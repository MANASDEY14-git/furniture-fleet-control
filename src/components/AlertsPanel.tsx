
import React from 'react';
import { AlertTriangle, Package, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLowStockAlerts, useResolveLowStockAlert, useCreateLowStockAlert } from '@/hooks/useLowStockAlerts';
import { useItems } from '@/hooks/useItems';
import type { LowStockItem } from '@/types';

interface AlertsPanelProps {
  lowStockItems: LowStockItem[];
  pendingDeliveries: number;
}

export default function AlertsPanel({ lowStockItems, pendingDeliveries }: AlertsPanelProps) {
  const { data: alerts = [] } = useLowStockAlerts();
  const { data: items = [] } = useItems();
  const createAlert = useCreateLowStockAlert();
  const resolveAlert = useResolveLowStockAlert();

  // Create alerts for new low stock items (fixed to prevent duplicates)
  React.useEffect(() => {
    if (items.length === 0 || alerts.length === 0) return;

    const newLowStockItems = items.filter(item => {
      const isLowStock = item.quantity_available < 1;
      const hasUnresolvedAlert = alerts.some(alert => 
        alert.item_id === item.id && !alert.is_resolved
      );
      return isLowStock && !hasUnresolvedAlert;
    });

    // Only create alerts for items that don't already have unresolved alerts
    newLowStockItems.forEach(item => {
      createAlert.mutate({
        item_id: item.id,
        item_name: item.name,
        current_quantity: item.quantity_available,
        threshold_quantity: 1,
        store_id: item.store_id,
        is_resolved: false
      });
    });
  }, [items, alerts, createAlert]);

  const handleResolveAlert = (alertId: string) => {
    resolveAlert.mutate(alertId);
  };

  return (
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-300 glow-text">
          <AlertTriangle className="h-5 w-5 text-orange-400" />
          System Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Low Stock Alerts from Database */}
        <div>
          <h4 className="font-medium text-sm text-blue-200 mb-2 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Critical Stock Levels
            {alerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {alerts.length}
              </Badge>
            )}
          </h4>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-orange-900/20 rounded-lg border border-orange-500/30">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-400" />
                    <div>
                      <span className="text-sm font-medium text-blue-100">{alert.item_name}</span>
                      <p className="text-xs text-orange-300">
                        Only {alert.current_quantity} units remaining (threshold: {alert.threshold_quantity})
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResolveAlert(alert.id)}
                    className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-900/20 rounded-lg border border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <p className="text-sm text-green-300">All items are adequately stocked</p>
            </div>
          )}
        </div>

        {/* Delivery Alerts */}
        <div>
          <h4 className="font-medium text-sm text-blue-200 mb-2">Pending Deliveries</h4>
          <div className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <span className="text-sm text-blue-100">Orders awaiting delivery</span>
            <Badge variant={pendingDeliveries > 5 ? "destructive" : "secondary"} className="text-cyan-300">
              {pendingDeliveries}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
