import { CheckCircle, AlertTriangle, XCircle, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateBOMData, BOMValidationResult } from '@/types/bom';
import { useMaterials } from '@/hooks/useMaterials';
import { useLaborCategories } from '@/hooks/useLaborCategories';

interface BOMReviewStepProps {
  data: CreateBOMData;
  itemName: string;
  validation: BOMValidationResult;
}

// Helper: get effective cost based on costing_method
const getEffectiveCost = (material: any) => {
  if (!material) return 0;
  if (material.costing_method === 'exact') {
    return material.cost_price || material.avg_cost || 0;
  }
  return material.avg_cost || material.cost_price || 0;
};

export function BOMReviewStep({ data, itemName, validation }: BOMReviewStepProps) {
  const { data: materials = [] } = useMaterials();
  const { data: laborCategories = [] } = useLaborCategories();

  const getMaterialName = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material?.name || 'Unknown Material';
  };

  const getMaterialCost = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material ? getEffectiveCost(material) : 0;
  };

  const calculateCosts = () => {
    let materialTotal = 0;
    let laborTotal = 0;
    let fixedServiceTotal = 0;
    let percentageServiceValues: number[] = [];

    data.components.forEach(component => {
      if (component.is_customizable) return;
      
      switch (component.component_type) {
        case 'material':
          if (component.material_id) {
            materialTotal += getMaterialCost(component.material_id) * component.quantity_required;
          }
          break;
        case 'labor': {
          const laborCat = laborCategories.find(cat => cat.id === component.labor_category_id);
          const hourlyRate = component.hourly_rate || laborCat?.default_hourly_rate || 0;
          const totalHours = (component.time_hours || 0) + ((component.time_minutes || 0) / 60);
          laborTotal += hourlyRate * totalHours;
          break;
        }
        case 'service':
          if (component.service_cost_type === 'percentage') {
            percentageServiceValues.push(component.service_cost || 0);
          } else {
            fixedServiceTotal += component.service_cost || 0;
          }
          break;
      }
    });

    const subtotal = materialTotal + laborTotal;
    const percentageTotal = percentageServiceValues.reduce((sum, pct) => sum + (subtotal * pct / 100), 0);
    const total = subtotal + fixedServiceTotal + percentageTotal;

    return { materialTotal, laborTotal, fixedServiceTotal, percentageTotal, total };
  };

  const costs = calculateCosts();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Review & Confirm</h3>
        <p className="text-sm text-muted-foreground">
          Review your BOM configuration before creating
        </p>
      </div>

      {/* Validation Status */}
      <Card className={`border-2 ${validation.isValid ? 'border-green-500/50 bg-green-50/50' : 'border-red-500/50 bg-red-50/50'}`}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <CardTitle className="text-base">
              Validation {validation.isValid ? 'Passed' : 'Failed'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {validation.errors.length > 0 && (
            <Alert className="mb-4 border-red-500/50 bg-red-50/50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium text-red-800">Errors that must be fixed:</p>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {validation.warnings.length > 0 && (
            <Alert className="border-yellow-500/50 bg-yellow-50/50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium text-yellow-800">Warnings to consider:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {validation.isValid && (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">BOM is ready to be created</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BOM Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">BOM Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm font-medium text-muted-foreground">Item:</span>
              <p className="text-sm">{itemName}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">BOM Name:</span>
              <p className="text-sm">{data.name || 'Unnamed BOM'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Components:</span>
              <p className="text-sm">{data.components.length}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Customizable:</span>
              <p className="text-sm">{data.components.filter(c => c.is_customizable).length}</p>
            </div>
            {data.version_notes && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Notes:</span>
                <p className="text-sm">{data.version_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Cost Estimation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Materials:</span>
                <span>₹{costs.materialTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor:</span>
                <span>₹{costs.laborTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fixed Services:</span>
                <span>₹{costs.fixedServiceTotal.toFixed(2)}</span>
              </div>
              {costs.percentageTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">% Services:</span>
                  <span>₹{costs.percentageTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-primary">₹{costs.total.toFixed(2)}</span>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Customizable Components:</span>
              <p className="text-sm">{data.components.filter(c => c.is_customizable).length} (Cost varies)</p>
            </div>
            <Badge variant="outline" className="text-xs">
              Uses weighted avg / exact cost per material
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Components Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Component Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Quantity/Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.components.map((component, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {component.component_name || `Component ${index + 1}`}
                  </TableCell>
                  <TableCell>
                    {component.is_customizable ? (
                      <Badge variant="secondary">
                        {component.options?.length || 0} options
                      </Badge>
                    ) : (
                      <>
                        {component.component_type === 'material' && getMaterialName(component.material_id || '')}
                        {component.component_type === 'labor' && (
                          <span>{laborCategories.find(cat => cat.id === component.labor_category_id)?.name || 'Labor'}</span>
                        )}
                        {component.component_type === 'service' && (
                          <span>
                            {component.service_cost_type === 'percentage' ? `${component.service_cost}% of subtotal` : 'Fixed service'}
                          </span>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {component.component_type === 'material' && component.quantity_required}
                    {component.component_type === 'labor' && (
                      <span>{component.time_hours}h {component.time_minutes}m</span>
                    )}
                    {component.component_type === 'service' && (
                      component.service_cost_type === 'percentage' ? `${component.service_cost}%` : '1 unit'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={component.is_customizable ? "outline" : "default"}>
                      {component.is_customizable ? 'Customizable' : component.component_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {component.is_customizable ? (
                      <span className="text-muted-foreground text-sm">Variable</span>
                    ) : (
                      <>
                        {component.component_type === 'material' && 
                          `₹${(getMaterialCost(component.material_id || '') * component.quantity_required).toFixed(2)}`}
                        {component.component_type === 'labor' && (
                          (() => {
                            const laborCat = laborCategories.find(cat => cat.id === component.labor_category_id);
                            const hourlyRate = component.hourly_rate || laborCat?.default_hourly_rate || 0;
                            const totalHours = (component.time_hours || 0) + ((component.time_minutes || 0) / 60);
                            return `₹${(hourlyRate * totalHours).toFixed(2)}`;
                          })()
                        )}
                        {component.component_type === 'service' && (
                          component.service_cost_type === 'percentage' 
                            ? `${component.service_cost}%` 
                            : `₹${(component.service_cost || 0).toFixed(2)}`
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
