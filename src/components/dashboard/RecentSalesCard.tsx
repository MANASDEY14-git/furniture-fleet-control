
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/currencyUtils';
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
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="text-cyan-300 glow-text">Recent Sales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-center text-blue-300 py-4">Loading...</p>
          ) : recentSales.length > 0 ? (
            recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-800/30 border border-blue-500/20 hover:border-cyan-400/40 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-blue-100">{sale.item_name}</p>
                  <p className="text-sm text-blue-300">{getStoreName(sale.store_id)} • {sale.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-cyan-300">{formatCurrency(Number(sale.total_price))}</p>
                  <p className="text-sm text-blue-300">Qty: {sale.quantity}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-blue-300 py-4">No recent sales</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
