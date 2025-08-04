import { useState } from 'react';
import { Calculator, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEnhancedBOMByItem } from '@/hooks/useEnhancedBOM';
import { useMaterials } from '@/hooks/useMaterials';
import { useLaborCategories } from '@/hooks/useLaborCategories';

interface BOMCostCalculatorProps {
  item: any;
}

export function BOMCostCalculator({ item }: BOMCostCalculatorProps) {
  const [quantity, setQuantity] = useState(1);
  const [wastePercentage, setWastePercentage] = useState(5);
  const [laborCost, setLaborCost] = useState(0);
  const [overheadPercentage, setOverheadPercentage] = useState(15);
  
  const { data: bom } = useEnhancedBOMByItem(item.id);
  const { data: materials = [] } = useMaterials();
  const { data: laborCategories = [] } = useLaborCategories();

  // Calculate component costs
  const componentCosts = bom?.bom_components?.map(component => {
    let baseCost = 0;
    let available = 0;
    let required = 0;
    let shortage = 0;
    
    if (component.component_type === 'material') {
      const material = materials.find(m => m.id === component.material_id);
      baseCost = (material?.cost_price || 0) * component.quantity_required;
      available = material?.quantity_available || 0;
      required = component.quantity_required * quantity;
      shortage = Math.max(0, required - available);
    } else if (component.component_type === 'labor') {
      const laborCat = laborCategories.find(cat => cat.id === component.labor_category_id);
      const hourlyRate = component.hourly_rate || laborCat?.default_hourly_rate || 0;
      const totalHours = (component.time_hours || 0) + ((component.time_minutes || 0) / 60);
      baseCost = hourlyRate * totalHours;
    } else if (component.component_type === 'service') {
      baseCost = component.service_cost || 0;
    }
    
    const wasteAdjustedCost = component.component_type === 'material' 
      ? baseCost * (1 + wastePercentage / 100) 
      : baseCost;
    
    return {
      component,
      material: component.component_type === 'material' ? materials.find(m => m.id === component.material_id) : null,
      baseCost,
      wasteAdjustedCost,
      totalCost: wasteAdjustedCost * quantity,
      available,
      required,
      shortage
    };
  }) || [];

  const totalComponentCost = componentCosts.reduce((sum, cost) => sum + cost.totalCost, 0);
  const totalLaborCost = laborCost * quantity;
  const subtotal = totalComponentCost + totalLaborCost;
  const overheadCost = subtotal * (overheadPercentage / 100);
  const totalCost = subtotal + overheadCost;
  const unitCost = quantity > 0 ? totalCost / quantity : 0;

  const hasShortages = componentCosts.some(cost => cost.shortage > 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-blue-200 hover:text-white hover:bg-blue-800/30">
          <Calculator className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl bg-slate-800 border-blue-500/30">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Cost Analysis - {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Controls */}
          <Card className="bg-slate-700/50 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-blue-200 text-sm">Production Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-blue-200">Quantity to Produce</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-slate-600/50 border-blue-500/30 text-white"
                  min={1}
                />
              </div>

              <div>
                <Label className="text-blue-200">Waste Percentage (%)</Label>
                <Input
                  type="number"
                  value={wastePercentage}
                  onChange={(e) => setWastePercentage(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-slate-600/50 border-blue-500/30 text-white"
                  min={0}
                  step={0.1}
                />
              </div>

              <div>
                <Label className="text-blue-200">Labor Cost per Unit</Label>
                <Input
                  type="number"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-slate-600/50 border-blue-500/30 text-white"
                  min={0}
                  step={0.01}
                />
              </div>

              <div>
                <Label className="text-blue-200">Overhead Percentage (%)</Label>
                <Input
                  type="number"
                  value={overheadPercentage}
                  onChange={(e) => setOverheadPercentage(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-slate-600/50 border-blue-500/30 text-white"
                  min={0}
                  step={0.1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card className="bg-slate-700/50 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-blue-200 text-sm">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-blue-200">Component Cost:</span>
                <span className="text-green-300 font-mono">
                  ₹{totalComponentCost.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-blue-200">Additional Labor:</span>
                <span className="text-green-300 font-mono">
                  ₹{totalLaborCost.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-blue-200">Overhead Cost:</span>
                <span className="text-green-300 font-mono">
                  ₹{overheadCost.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-blue-500/30 pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-cyan-300">Total Cost:</span>
                  <span className="text-cyan-300 font-mono">
                    ₹{totalCost.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-blue-200">Cost per Unit:</span>
                <span className="text-yellow-300 font-mono">
                  ₹{unitCost.toFixed(2)}
                </span>
              </div>

              {hasShortages && (
                <Badge variant="destructive" className="w-full justify-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Material Shortages Detected
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Pricing Suggestions */}
          <Card className="bg-slate-700/50 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-blue-200 text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Pricing Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-blue-300 mb-1">Break-even Price</div>
                <div className="text-lg font-bold text-yellow-300 font-mono">
                  ₹{unitCost.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-blue-300 mb-1">25% Markup</div>
                <div className="text-lg font-bold text-green-300 font-mono">
                  ₹{(unitCost * 1.25).toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-blue-300 mb-1">50% Markup</div>
                <div className="text-lg font-bold text-green-300 font-mono">
                  ₹{(unitCost * 1.5).toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-blue-300 mb-1">Current Selling Price</div>
                <div className="text-lg font-bold text-cyan-300 font-mono">
                  ₹{item.selling_price?.toFixed(2) || 'N/A'}
                </div>
              </div>

              {item.selling_price && (
                <div className="text-xs">
                  <span className="text-blue-200">Margin: </span>
                  <span className={`font-bold ${
                    item.selling_price > unitCost ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {((item.selling_price - unitCost) / item.selling_price * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Component Details Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Component Requirements & Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {componentCosts.map((cost, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {cost.component.component_name || 
                        (cost.component.component_type === 'material' && cost.material?.name) ||
                        (cost.component.component_type === 'labor' && 
                          laborCategories.find(cat => cat.id === cost.component.labor_category_id)?.name) ||
                        'Service'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{cost.component.component_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {cost.component.component_type === 'material' && (
                        `${cost.required} ${cost.material?.unit || 'units'}`
                      )}
                      {cost.component.component_type === 'labor' && (
                        `${cost.component.time_hours}h ${cost.component.time_minutes}m`
                      )}
                      {cost.component.component_type === 'service' && '1 unit'}
                    </TableCell>
                    <TableCell>
                      {cost.component.component_type === 'material' ? (
                        `${cost.available} ${cost.material?.unit || 'units'}`
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {cost.component.component_type === 'material' && `₹${(cost.material?.cost_price || 0).toFixed(2)}`}
                      {cost.component.component_type === 'labor' && (
                        `₹${(cost.component.hourly_rate || laborCategories.find(cat => cat.id === cost.component.labor_category_id)?.default_hourly_rate || 0).toFixed(2)}/hr`
                      )}
                      {cost.component.component_type === 'service' && `₹${(cost.component.service_cost || 0).toFixed(2)}`}
                    </TableCell>
                    <TableCell className="font-mono">
                      ₹{cost.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {cost.component.component_type === 'material' && cost.shortage > 0 ? (
                        <Badge variant="destructive">
                          Short {cost.shortage}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {cost.component.component_type === 'material' ? 'Available' : 'Ready'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}