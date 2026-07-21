import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Package, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useMaterials } from '@/hooks/useMaterials';
import type { BOM } from '@/types/bom';

interface BOMStockIntegrationProps {
  bom: BOM;
  onReorderRequest?: (materialId: string, quantity: number) => void;
}

interface StockStatus {
  materialId: string;
  materialName: string;
  required: number;
  available: number;
  shortfall: number;
  status: 'available' | 'low' | 'critical' | 'unavailable';
  unit: string;
}

export function BOMStockIntegration({ bom, onReorderRequest }: BOMStockIntegrationProps) {
  const [stockStatuses, setStockStatuses] = useState<StockStatus[]>([]);
  const { data: materials = [] } = useMaterials();
  const { toast } = useToast();

  useEffect(() => {
    if (!bom?.bom_components) return;

    const statuses: StockStatus[] = bom.bom_components
      .filter(comp => comp.component_type === 'material' && comp.material_id)
      .map(comp => {
        const material = materials.find(m => m.id === comp.material_id);
        const required = comp.quantity_required;
        const available = material?.quantity_available || 0;
        const shortfall = Math.max(0, required - available);
        
        let status: StockStatus['status'] = 'available';
        if (available === 0) status = 'unavailable';
        else if (shortfall > 0) status = 'critical';
        else if (available < required * 1.2) status = 'low'; // 20% buffer

        return {
          materialId: comp.material_id!,
          materialName: material?.name || comp.component_name || 'Unknown Material',
          required,
          available,
          shortfall,
          status,
          unit: material?.unit || 'units'
        };
      });

    setStockStatuses(statuses);
  }, [bom, materials]);

  const getStatusColor = (status: StockStatus['status']) => {
    switch (status) {
      case 'available': return 'bg-green-600';
      case 'low': return 'bg-yellow-600';
      case 'critical': return 'bg-orange-600';
      case 'unavailable': return 'bg-red-600';
    }
  };

  const getStatusIcon = (status: StockStatus['status']) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'low': return <TrendingDown className="w-4 h-4 text-yellow-400" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'unavailable': return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
  };

  const handleReorder = (materialId: string, shortfall: number) => {
    const reorderQuantity = shortfall + (shortfall * 0.2); // 20% buffer
    onReorderRequest?.(materialId, reorderQuantity);
    toast({
      title: "Reorder Requested",
      description: `Request sent for ${reorderQuantity.toFixed(2)} units`,
    });
  };

  const criticalCount = stockStatuses.filter(s => s.status === 'critical' || s.status === 'unavailable').length;
  const lowStockCount = stockStatuses.filter(s => s.status === 'low').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Total Materials</p>
                <p className="text-2xl font-bold text-cyan-300">{stockStatuses.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-200">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-300">{lowStockCount}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-200">Critical/Out</p>
                <p className="text-2xl font-bold text-red-300">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Status Details */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300">Material Stock Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stockStatuses.map((stock) => (
              <div key={stock.materialId} className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(stock.status)}
                    <div>
                      <h4 className="font-medium text-white">{stock.materialName}</h4>
                      <p className="text-sm text-blue-200">
                        Required: {stock.required} {stock.unit} | Available: {stock.available} {stock.unit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(stock.status)}>
                      {stock.status.charAt(0).toUpperCase() + stock.status.slice(1)}
                    </Badge>
                    {stock.shortfall > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReorder(stock.materialId, stock.shortfall)}
                        className="border-blue-500/30 text-blue-200 hover:bg-blue-800/30"
                      >
                        Reorder {stock.shortfall.toFixed(2)} {stock.unit}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-blue-200">
                    <span>Availability</span>
                    <span>{((stock.available / stock.required) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(100, (stock.available / stock.required) * 100)}
                    className="h-2"
                  />
                </div>

                {stock.shortfall > 0 && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                    <p className="text-sm text-red-300">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      Shortfall: {stock.shortfall.toFixed(2)} {stock.unit}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {stockStatuses.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Materials</h3>
                <p className="text-blue-200">This BOM doesn't have any material components.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}