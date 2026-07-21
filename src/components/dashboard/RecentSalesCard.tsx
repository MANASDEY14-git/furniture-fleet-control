
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-800/30 border border-blue-500/20">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="text-right space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
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
