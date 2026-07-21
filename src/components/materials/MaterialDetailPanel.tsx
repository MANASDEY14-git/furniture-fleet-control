import React, { useState } from 'react';
import { ArrowLeft, Package2, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Material } from '@/hooks/useMaterials';
import { formatCurrency } from '@/utils/currencyUtils';
import MaterialForm from '@/components/MaterialForm';
import MaterialOverviewTab from './tabs/MaterialOverviewTab';
import MaterialPurchasesTab from './tabs/MaterialPurchasesTab';
import MaterialMovementsTab from './tabs/MaterialMovementsTab';
import MaterialConsumptionTab from './tabs/MaterialConsumptionTab';
import { cn } from '@/lib/utils';

interface MaterialDetailPanelProps {
  material: Material;
  onBack?: () => void;
  isMobile?: boolean;
}

export default function MaterialDetailPanel({ 
  material, 
  onBack, 
  isMobile = false 
}: MaterialDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const avgCost = (material as any).avg_cost ?? material.cost_price;
  const totalValue = material.quantity_available * avgCost;
  const isLowStock = material.quantity_available <= 5;
  const isCritical = material.quantity_available <= 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Package2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold truncate">{material.name}</h2>
            {isLowStock && (
              <Badge variant={isCritical ? "destructive" : "secondary"} className="ml-2">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {isCritical ? 'Out of Stock' : 'Low Stock'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {material.unit || 'Units'} • Last purchase: {formatCurrency(material.cost_price)}
          </p>
        </div>
        <MaterialForm
          material={material}
          trigger={
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          }
        />
      </div>

      {/* Compact KPI Summary - Always visible */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Package2 className={cn(
              "w-4 h-4",
              isCritical ? "text-destructive" : isLowStock ? "text-yellow-500" : "text-primary"
            )} />
            <div>
              <p className="text-xs text-muted-foreground">Stock</p>
              <p className={cn(
                "font-bold text-lg",
                isCritical && "text-destructive",
                isLowStock && !isCritical && "text-yellow-500"
              )}>
                {material.quantity_available}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-muted-foreground">Avg Cost</p>
              <p className="font-bold text-lg">{formatCurrency(avgCost)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Last Price</p>
              <p className="font-bold text-lg">{formatCurrency(material.cost_price)}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="font-bold text-lg text-green-600">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-4 mb-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="consumption">Consumption</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="overview" className="h-full m-0">
            <MaterialOverviewTab material={material} />
          </TabsContent>
          <TabsContent value="purchases" className="h-full m-0">
            <MaterialPurchasesTab material={material} />
          </TabsContent>
          <TabsContent value="movements" className="h-full m-0">
            <MaterialMovementsTab material={material} />
          </TabsContent>
          <TabsContent value="consumption" className="h-full m-0">
            <MaterialConsumptionTab material={material} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
