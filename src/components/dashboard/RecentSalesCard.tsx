
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Sale, Store } from '@/types';

interface RecentSalesCardProps {
  recentSales: Sale[];
  stores: Store[];
  isLoading: boolean;
}

export default function RecentSalesCard({ recentSales, stores, isLoading }: RecentSalesCardProps) {
  const getStoreName = (storeId: string) => {
    return stores.find(store => store.id === storeId)?.name || 'Unknown Store';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-gray-500 py-4">Loading...</p>
          ) : recentSales.length > 0 ? (
            recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{sale.item_name}</p>
                  <p className="text-sm text-gray-500">{getStoreName(sale.store_id)} • {sale.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">${Number(sale.total_price).toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Qty: {sale.quantity}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">No recent sales</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
