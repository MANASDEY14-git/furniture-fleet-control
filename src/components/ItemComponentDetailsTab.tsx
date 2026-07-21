import { AlertCircle, Package, Wrench, Clock, DollarSign, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useEnhancedBOMByItem } from '@/hooks/useEnhancedBOM';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

interface ItemComponentDetailsTabProps {
  itemId?: string;
}

export default function ItemComponentDetailsTab({ itemId }: ItemComponentDetailsTabProps) {
  const navigate = useNavigate();
  const { data: bom, isLoading, error } = useEnhancedBOMByItem(itemId || '');

  if (!itemId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Save the item first to view component details.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load component details. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!bom) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle>No BOM Configured</CardTitle>
          <CardDescription>
            This item doesn't have a Bill of Materials yet. Create one to define components, materials, and costs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => navigate('/bom-management')}>
            <Package className="w-4 h-4 mr-2" />
            Create BOM
          </Button>
        </CardContent>
      </Card>
    );
  }

  const materialComponents = bom.bom_components?.filter(c => c.component_type === 'material') || [];
  const laborComponents = bom.bom_components?.filter(c => c.component_type === 'labor') || [];
  const serviceComponents = bom.bom_components?.filter(c => c.component_type === 'service') || [];

  return (
    <div className="space-y-6">
      {/* BOM Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {bom.name || 'Bill of Materials'}
                <Badge variant="outline">v{bom.version || 1}</Badge>
              </CardTitle>
              <CardDescription>
                Estimated Cost: ₹{(bom.estimated_cost || 0).toFixed(2)}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/bom-management')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Edit BOM
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Material Components */}
      {materialComponents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" />
            Materials ({materialComponents.length})
          </h3>
          <div className="grid gap-3">
            {materialComponents.map((component) => {
              const material = component.materials;
              const hasStock = material && (material.quantity_available || 0) >= (component.quantity_required || 0);
              const hasOptions = (component.bom_component_options?.length || 0) > 0;

              return (
                <Card key={component.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{component.component_name}</span>
                          {component.is_customizable && (
                            <Badge variant="secondary" className="text-xs">Customizable</Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Material: {material?.name || 'Not selected'}</div>
                          <div>Required: {component.quantity_required} {material?.unit || 'units'}</div>
                          {material && (
                            <div className="flex items-center gap-2">
                              <span>Available: {material.quantity_available || 0} {material.unit}</span>
                              {hasStock ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                          )}
                          {material?.cost_price && (
                            <div>Unit Cost: ₹{material.cost_price}</div>
                          )}
                        </div>

                        {hasOptions && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-medium mb-2">Customization Options:</div>
                            <div className="space-y-1">
                              {component.bom_component_options?.map((option) => (
                                <div key={option.id} className="text-xs text-muted-foreground flex items-center justify-between">
                                  <span>• {option.option_name}</span>
                                  {option.materials && (
                                    <span className="text-xs">
                                      {option.materials.quantity_available || 0} {option.materials.unit} available
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {component.notes && (
                          <div className="text-xs text-muted-foreground italic mt-2">
                            Note: {component.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Labor Components */}
      {laborComponents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Labor ({laborComponents.length})
          </h3>
          <div className="grid gap-3">
            {laborComponents.map((component) => {
              const totalHours = (component.time_hours || 0) + (component.time_minutes || 0) / 60;
              const cost = totalHours * (component.hourly_rate || component.labor_categories?.default_hourly_rate || 0);

              return (
                <Card key={component.id}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="font-medium">{component.component_name}</div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {component.time_hours || 0}h {component.time_minutes || 0}m
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          ₹{component.hourly_rate || component.labor_categories?.default_hourly_rate || 0}/hr
                        </div>
                        <div className="font-medium">
                          Total Cost: ₹{cost.toFixed(2)}
                        </div>
                      </div>
                      {component.notes && (
                        <div className="text-xs text-muted-foreground italic">
                          Note: {component.notes}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Service Components */}
      {serviceComponents.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Services ({serviceComponents.length})
          </h3>
          <div className="grid gap-3">
            {serviceComponents.map((component) => (
              <Card key={component.id}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="font-medium">{component.component_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Cost: ₹{component.service_cost || 0}
                    </div>
                    {component.notes && (
                      <div className="text-xs text-muted-foreground italic">
                        Note: {component.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {materialComponents.length === 0 && laborComponents.length === 0 && serviceComponents.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No components defined in this BOM yet.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
