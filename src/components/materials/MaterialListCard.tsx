import React from 'react';
import { Package2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/currencyUtils';
import { Material } from '@/hooks/useMaterials';

interface MaterialListCardProps {
  material: Material;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean;
}

export default function MaterialListCard({ 
  material, 
  isSelected, 
  onClick, 
  compact = false 
}: MaterialListCardProps) {
  const isLowStock = material.quantity_available <= 5;
  const isCritical = material.quantity_available <= 0;
  const avgCost = (material as any).avg_cost ?? material.cost_price;
  const totalValue = material.quantity_available * avgCost;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "p-3 rounded-lg cursor-pointer transition-all duration-200 border",
          isSelected
            ? "bg-primary/10 border-primary"
            : "bg-card hover:bg-accent border-border hover:border-primary/50"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{material.name}</span>
              {isLowStock && (
                <AlertTriangle className={cn(
                  "w-3 h-3 flex-shrink-0",
                  isCritical ? "text-destructive" : "text-yellow-500"
                )} />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className={cn(
                "font-semibold",
                isCritical && "text-destructive",
                isLowStock && !isCritical && "text-yellow-500"
              )}>
                {material.quantity_available} {material.unit || 'units'}
              </span>
              <span>•</span>
              <span>{formatCurrency(avgCost)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-medium text-primary">
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Full card for mobile
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg cursor-pointer transition-all duration-200 border bg-card",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Package2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{material.name}</h3>
        </div>
        {isLowStock && (
          <span className={cn(
            "text-xs px-2 py-0.5 rounded",
            isCritical 
              ? "bg-destructive/20 text-destructive" 
              : "bg-yellow-500/20 text-yellow-600"
          )}>
            {isCritical ? 'Out of Stock' : 'Low Stock'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Stock</p>
          <p className="font-semibold">
            {material.quantity_available} {material.unit || 'units'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Avg Cost</p>
          <p className="font-semibold">{formatCurrency(avgCost)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Value</p>
          <p className="font-semibold text-primary">{formatCurrency(totalValue)}</p>
        </div>
      </div>
    </div>
  );
}
