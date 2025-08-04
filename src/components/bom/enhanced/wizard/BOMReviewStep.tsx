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

export function BOMReviewStep({ data, itemName, validation }: BOMReviewStepProps) {
  const { data: materials = [] } = useMaterials();
  const { data: laborCategories = [] } = useLaborCategories();

  const getMaterialName = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material?.name || 'Unknown Material';
  };

  const getMaterialCost = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material?.cost_price || 0;
  };

  const calculateTotalCost = () => {
    return data.components.reduce((total, component) => {
      if (component.is_customizable) return total;
      
      switch (component.component_type) {
        case 'material':
          if (component.material_id) {
            const materialCost = getMaterialCost(component.material_id);
            return total + (materialCost * component.quantity_required);
          }
          break;
        case 'labor':
          const laborCat = laborCategories.find(cat => cat.id === component.labor_category_id);
          const hourlyRate = component.hourly_rate || laborCat?.default_hourly_rate || 0;
          const totalHours = (component.time_hours || 0) + ((component.time_minutes || 0) / 60);
          return total + (hourlyRate * totalHours);
        case 'service':
          return total + (component.service_cost || 0);
      }
      return total;
    }, 0);
  };

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
            <div>
              <span className="text-sm font-medium text-muted-foreground">Fixed Components Cost:</span>
              <p className="text-lg font-bold text-primary">₹{calculateTotalCost().toFixed(2)}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Customizable Components:</span>
              <p className="text-sm">{data.components.filter(c => c.is_customizable).length} (Cost varies)</p>
            </div>
            <Badge variant="outline" className="text-xs">
              Base cost estimate only
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
                        {component.component_type === 'service' && <span>Service</span>}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {component.component_type === 'material' && component.quantity_required}
                    {component.component_type === 'labor' && (
                      <span>{component.time_hours}h {component.time_minutes}m</span>
                    )}
                    {component.component_type === 'service' && '1 unit'}
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
                        {component.component_type === 'service' && `₹${(component.service_cost || 0).toFixed(2)}`}
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