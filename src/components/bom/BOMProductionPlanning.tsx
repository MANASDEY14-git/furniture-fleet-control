import { useState } from 'react';
import { Calendar, Clock, Users, Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { BOM } from '@/types/bom';

interface ProductionPlan {
  quantity: number;
  startDate: string;
  estimatedDuration: number; // in hours
  laborRequired: number;
  materialShortages: Array<{
    materialId: string;
    materialName: string;
    required: number;
    available: number;
    shortage: number;
  }>;
  totalCost: number;
}

interface BOMProductionPlanningProps {
  bom: BOM;
  className?: string;
}

export function BOMProductionPlanning({ bom, className = '' }: BOMProductionPlanningProps) {
  const [plannedQuantity, setPlannedQuantity] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [productionPlan, setProductionPlan] = useState<ProductionPlan | null>(null);

  const calculateProductionPlan = () => {
    const materialShortages: ProductionPlan['materialShortages'] = [];
    let totalLaborHours = 0;
    let totalCost = 0;

    // Calculate material requirements and identify shortages
    bom.bom_components.forEach(component => {
      const requiredQuantity = component.quantity_required * plannedQuantity;
      
      if (component.component_type === 'material' && component.materials) {
        const available = component.materials.quantity_available;
        if (available < requiredQuantity) {
          materialShortages.push({
            materialId: component.material_id!,
            materialName: component.materials.name,
            required: requiredQuantity,
            available,
            shortage: requiredQuantity - available
          });
        }
        totalCost += requiredQuantity * component.materials.cost_price;
      } else if (component.component_type === 'labor') {
        const hours = (component.time_hours || 0) + ((component.time_minutes || 0) / 60);
        totalLaborHours += hours * plannedQuantity;
        const rate = component.hourly_rate || component.labor_categories?.default_hourly_rate || 0;
        totalCost += hours * plannedQuantity * rate;
      } else if (component.component_type === 'service') {
        totalCost += (component.service_cost || 0) * plannedQuantity;
      }
    });

    const plan: ProductionPlan = {
      quantity: plannedQuantity,
      startDate,
      estimatedDuration: totalLaborHours + (materialShortages.length > 0 ? 8 : 0), // Add buffer for material procurement
      laborRequired: Math.ceil(totalLaborHours / 8), // Assuming 8-hour workdays
      materialShortages,
      totalCost
    };

    setProductionPlan(plan);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Production Planning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity" className="text-blue-200">Production Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={plannedQuantity}
                onChange={(e) => setPlannedQuantity(parseInt(e.target.value) || 1)}
                className="bg-slate-700/50 border-blue-500/30"
              />
            </div>
            <div>
              <Label htmlFor="startDate" className="text-blue-200">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-700/50 border-blue-500/30"
              />
            </div>
          </div>
          
          <Button onClick={calculateProductionPlan} className="w-full">
            Calculate Production Plan
          </Button>
        </CardContent>
      </Card>

      {productionPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-200 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <div className="text-2xl font-bold text-cyan-300">
                {productionPlan.estimatedDuration}h
              </div>
              <div className="text-xs text-gray-400">
                ~{Math.ceil(productionPlan.estimatedDuration / 8)} days
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-200 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Labor Days</span>
              </div>
              <div className="text-2xl font-bold text-green-300">
                {productionPlan.laborRequired}
              </div>
              <div className="text-xs text-gray-400">
                Person-days required
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-200 mb-2">
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium">Total Cost</span>
              </div>
              <div className="text-2xl font-bold text-yellow-300">
                ₹{productionPlan.totalCost.toFixed(0)}
              </div>
              <div className="text-xs text-gray-400">
                Estimated production cost
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-200 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Issues</span>
              </div>
              <div className="text-2xl font-bold text-red-300">
                {productionPlan.materialShortages.length}
              </div>
              <div className="text-xs text-gray-400">
                Material shortages
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {productionPlan && productionPlan.materialShortages.length > 0 && (
        <Alert className="border-red-500/30 bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            <div className="font-semibold mb-2">Material Shortages Detected</div>
            <div className="space-y-2">
              {productionPlan.materialShortages.map((shortage, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>{shortage.materialName}</span>
                  <Badge variant="destructive" className="text-xs">
                    Short: {shortage.shortage} units
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm">
              <strong>Action Required:</strong> Purchase additional materials before starting production.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {productionPlan && (
        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-300 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Production Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                <span className="text-blue-200">Start Production</span>
                <span className="text-green-300">{new Date(startDate).toLocaleDateString()}</span>
              </div>
              
              {productionPlan.materialShortages.length > 0 && (
                <div className="flex justify-between items-center p-3 bg-orange-900/20 rounded border border-orange-500/30">
                  <span className="text-orange-200">Material Procurement</span>
                  <Badge variant="outline" className="text-orange-300">
                    1-3 days delay
                  </Badge>
                </div>
              )}
              
              <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded">
                <span className="text-blue-200">Production Phase</span>
                <span className="text-blue-300">{productionPlan.estimatedDuration} hours</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-green-900/20 rounded border border-green-500/30">
                <span className="text-green-200">Estimated Completion</span>
                <span className="text-green-300">
                  {new Date(new Date(startDate).getTime() + (productionPlan.estimatedDuration / 8 + (productionPlan.materialShortages.length > 0 ? 2 : 0)) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}