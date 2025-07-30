import { useState } from 'react';
import { Calculator, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBOMByItem } from '@/hooks/useBOM';
import { useMaterials } from '@/hooks/useMaterials';

interface BOMCostCalculatorProps {
  item: any;
}

export function BOMCostCalculator({ item }: BOMCostCalculatorProps) {
  const [quantity, setQuantity] = useState(1);
  const [wastePercentage, setWastePercentage] = useState(5);
  const [laborCost, setLaborCost] = useState(0);
  const [overheadPercentage, setOverheadPercentage] = useState(15);
  
  const { data: bom } = useBOMByItem(item.id);
  const { data: materials = [] } = useMaterials();

  // Calculate material costs
  const materialCosts = bom?.bom_components?.map(component => {
    const material = materials.find(m => m.id === component.material_id);
    const baseCost = (material?.cost_price || 0) * component.quantity_required;
    const wasteAdjustedCost = baseCost * (1 + wastePercentage / 100);
    
    return {
      component,
      material,
      baseCost,
      wasteAdjustedCost,
      totalCost: wasteAdjustedCost * quantity,
      available: material?.quantity_available || 0,
      required: component.quantity_required * quantity,
      shortage: Math.max(0, (component.quantity_required * quantity) - (material?.quantity_available || 0))
    };
  }) || [];

  const totalMaterialCost = materialCosts.reduce((sum, cost) => sum + cost.totalCost, 0);
  const totalLaborCost = laborCost * quantity;
  const subtotal = totalMaterialCost + totalLaborCost;
  const overheadCost = subtotal * (overheadPercentage / 100);
  const totalCost = subtotal + overheadCost;
  const unitCost = quantity > 0 ? totalCost / quantity : 0;

  const hasShortages = materialCosts.some(cost => cost.shortage > 0);

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
                <span className="text-blue-200">Material Cost:</span>
                <span className="text-green-300 font-mono">
                  ${totalMaterialCost.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-blue-200">Labor Cost:</span>
                <span className="text-green-300 font-mono">
                  ${totalLaborCost.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-blue-200">Overhead Cost:</span>
                <span className="text-green-300 font-mono">
                  ${overheadCost.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-blue-500/30 pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-cyan-300">Total Cost:</span>
                  <span className="text-cyan-300 font-mono">
                    ${totalCost.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-blue-200">Cost per Unit:</span>
                <span className="text-yellow-300 font-mono">
                  ${unitCost.toFixed(2)}
                </span>
              </div>

              {hasShortages && (
                <Badge variant="destructive" className="w-full justify-center bg-red-600/20 text-red-300">
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
                  ${unitCost.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-blue-300 mb-1">25% Markup</div>
                <div className="text-lg font-bold text-green-300 font-mono">
                  ${(unitCost * 1.25).toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-blue-300 mb-1">50% Markup</div>
                <div className="text-lg font-bold text-green-300 font-mono">
                  ${(unitCost * 1.5).toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-blue-300 mb-1">Current Selling Price</div>
                <div className="text-lg font-bold text-cyan-300 font-mono">
                  ${item.selling_price?.toFixed(2) || 'N/A'}
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

        {/* Material Details Table */}
        <Card className="bg-slate-700/50 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-blue-200 text-sm">Material Requirements & Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Material</TableHead>
                  <TableHead className="text-blue-200">Required</TableHead>
                  <TableHead className="text-blue-200">Available</TableHead>
                  <TableHead className="text-blue-200">Unit Cost</TableHead>
                  <TableHead className="text-blue-200">Total Cost</TableHead>
                  <TableHead className="text-blue-200">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialCosts.map((cost, index) => (
                  <TableRow key={index} className="border-blue-500/20">
                    <TableCell className="text-white">
                      {cost.material?.name || 'Unknown Material'}
                    </TableCell>
                    <TableCell className="text-blue-200">
                      {cost.required} {cost.material?.unit || 'units'}
                    </TableCell>
                    <TableCell className="text-blue-200">
                      {cost.available} {cost.material?.unit || 'units'}
                    </TableCell>
                    <TableCell className="text-green-300 font-mono">
                      ${(cost.material?.cost_price || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-green-300 font-mono">
                      ${cost.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {cost.shortage > 0 ? (
                        <Badge variant="destructive" className="bg-red-600/20 text-red-300">
                          Short {cost.shortage}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-600/20 text-green-300">
                          Available
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