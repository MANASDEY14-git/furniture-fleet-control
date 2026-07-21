import React from 'react';
import { Package2, TrendingUp, Calendar, AlertTriangle, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Material } from '@/hooks/useMaterials';
import { formatCurrency } from '@/utils/currencyUtils';
import { useMaterialStockMovements } from '@/hooks/useMaterialStockMovements';
import { useMaterialPurchases } from '@/hooks/useMaterialPurchases';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MaterialOverviewTabProps {
  material: Material;
}

export default function MaterialOverviewTab({ material }: MaterialOverviewTabProps) {
  const { data: movements = [] } = useMaterialStockMovements(material.id);
  const { data: purchases = [] } = useMaterialPurchases();

  const materialPurchases = purchases.filter(p => p.material_id === material.id);
  const avgCost = (material as any).avg_cost ?? material.cost_price;
  const totalValue = material.quantity_available * avgCost;
  const isLowStock = material.quantity_available <= 5;
  const isCritical = material.quantity_available <= 0;

  // Calculate stats
  const totalPurchased = movements
    .filter(m => m.movement_type === 'purchase')
    .reduce((sum, m) => sum + m.quantity_change, 0);
  
  const totalConsumed = movements
    .filter(m => m.movement_type === 'consumption' || m.movement_type === 'sale')
    .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);

  const lastPurchase = materialPurchases[0];

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-2">
      {/* Stock Status Alert */}
      {isLowStock && (
        <div className={cn(
          "p-4 rounded-lg border flex items-center gap-3",
          isCritical 
            ? "bg-destructive/10 border-destructive/30" 
            : "bg-yellow-500/10 border-yellow-500/30"
        )}>
          <AlertTriangle className={cn(
            "w-5 h-5",
            isCritical ? "text-destructive" : "text-yellow-500"
          )} />
          <div>
            <p className={cn(
              "font-semibold",
              isCritical ? "text-destructive" : "text-yellow-600"
            )}>
              {isCritical ? 'Out of Stock!' : 'Low Stock Warning'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isCritical 
                ? 'This material needs to be restocked immediately.'
                : `Only ${material.quantity_available} ${material.unit || 'units'} remaining.`
              }
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">
                  {material.quantity_available} <span className="text-sm font-normal text-muted-foreground">{material.unit || 'units'}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weighted Avg Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(avgCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Activity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-sm text-muted-foreground">Total Purchased</p>
              <p className="text-xl font-bold text-green-600">
                +{totalPurchased} {material.unit || 'units'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-muted-foreground">Total Consumed</p>
              <p className="text-xl font-bold text-red-600">
                -{totalConsumed} {material.unit || 'units'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Purchase Info */}
      {lastPurchase && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Last Purchase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(lastPurchase.date), 'dd MMM yyyy')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Quantity</p>
                <p className="font-medium">{lastPurchase.quantity} {material.unit || 'units'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Unit Cost</p>
                <p className="font-medium">{formatCurrency(lastPurchase.unit_cost)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium">{formatCurrency(lastPurchase.total_cost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
