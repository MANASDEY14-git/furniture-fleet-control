
import React from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LowStockItem } from '@/types';

interface AlertsPanelProps {
  lowStockItems: LowStockItem[];
  pendingDeliveries: number;
}

export default function AlertsPanel({ lowStockItems, pendingDeliveries }: AlertsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Alerts & Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Low Stock Alerts */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-2">Low Stock Items</h4>
          {lowStockItems.length > 0 ? (
            <div className="space-y-2">
              {lowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {item.quantity_available} left
                    </Badge>
                    <span className="text-xs text-gray-500">
                      ${item.selling_price.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No low stock items</p>
          )}
        </div>

        {/* Delivery Alerts */}
        <div>
          <h4 className="font-medium text-sm text-gray-700 mb-2">Pending Deliveries</h4>
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
            <span className="text-sm">Orders awaiting delivery</span>
            <Badge variant={pendingDeliveries > 5 ? "destructive" : "secondary"}>
              {pendingDeliveries}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
