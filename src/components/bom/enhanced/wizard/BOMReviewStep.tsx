import { CheckCircle, AlertTriangle, XCircle, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateBOMData, BOMValidationResult } from '@/types/bom';
import { useMaterials } from '@/hooks/useMaterials';

interface BOMReviewStepProps {
  data: CreateBOMData;
  itemName: string;
  validation: BOMValidationResult;
}

export function BOMReviewStep({ data, itemName, validation }: BOMReviewStepProps) {
  const { data: materials = [] } = useMaterials();

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
      if (!component.is_customizable && component.material_id) {
        const materialCost = getMaterialCost(component.material_id);
        return total + (materialCost * component.quantity_required);
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
                <TableHead>Material</TableHead>
                <TableHead>Quantity</TableHead>
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
                      getMaterialName(component.material_id || '')
                    )}
                  </TableCell>
                  <TableCell>{component.quantity_required}</TableCell>
                  <TableCell>
                    <Badge variant={component.is_customizable ? "outline" : "default"}>
                      {component.is_customizable ? 'Customizable' : 'Fixed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {component.is_customizable ? (
                      <span className="text-muted-foreground text-sm">Variable</span>
                    ) : (
                      `₹${(getMaterialCost(component.material_id || '') * component.quantity_required).toFixed(2)}`
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