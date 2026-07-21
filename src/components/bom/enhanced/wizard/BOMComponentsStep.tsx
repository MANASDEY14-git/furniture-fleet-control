import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, X, Lock, Palette, Star, AlertCircle } from 'lucide-react';
import { useMaterials } from '@/hooks/useMaterials';
import { useLaborCategories } from '@/hooks/useLaborCategories';
import type { CreateBOMComponentData } from '@/types/bom';

interface BOMComponentsStepProps {
  components: CreateBOMComponentData[];
  onChange: (components: CreateBOMComponentData[]) => void;
}

export const BOMComponentsStep: React.FC<BOMComponentsStepProps> = ({ 
  components, 
  onChange 
}) => {
  const { data: materials = [] } = useMaterials();
  const { data: laborCategories = [] } = useLaborCategories();

  const addComponent = () => {
    const newComponent: CreateBOMComponentData = {
      quantity_required: 1,
      component_name: `Component ${components.length + 1}`,
      is_customizable: false,
      notes: '',
      component_type: 'material',
      options: []
    };
    onChange([...components, newComponent]);
  };

  const updateComponent = (index: number, updates: Partial<CreateBOMComponentData>) => {
    const updatedComponents = components.map((component, i) => 
      i === index ? { ...component, ...updates } : component
    );
    onChange(updatedComponents);
  };

  const removeComponent = (index: number) => {
    onChange(components.filter((_, i) => i !== index));
  };

  const addOption = (componentIndex: number) => {
    const component = components[componentIndex];
    const isFirst = !component.options || component.options.length === 0;
    const newOption = { 
      material_id: '', 
      option_name: '',
      quantity_required: component.quantity_required, // Inherit default quantity
      is_default: isFirst, // First option is default
      price_adjustment: 0
    };
    updateComponent(componentIndex, {
      options: [...(component.options || []), newOption]
    });
  };

  const updateOption = (
    componentIndex: number, 
    optionIndex: number, 
    updates: { 
      material_id?: string; 
      option_name?: string;
      quantity_required?: number | null;
      is_default?: boolean;
      price_adjustment?: number;
    }
  ) => {
    const component = components[componentIndex];
    let updatedOptions = (component.options || []).map((option, i) =>
      i === optionIndex ? { ...option, ...updates } : option
    );
    
    // If setting is_default to true, unset others
    if (updates.is_default === true) {
      updatedOptions = updatedOptions.map((opt, i) => ({
        ...opt,
        is_default: i === optionIndex
      }));
    }
    
    updateComponent(componentIndex, { options: updatedOptions });
  };

  const removeOption = (componentIndex: number, optionIndex: number) => {
    const component = components[componentIndex];
    const updatedOptions = (component.options || []).filter((_, i) => i !== optionIndex);
    // If we removed the default, make the first one default
    if (updatedOptions.length > 0 && !updatedOptions.some(o => o.is_default)) {
      updatedOptions[0].is_default = true;
    }
    updateComponent(componentIndex, { options: updatedOptions });
  };

  const handleCustomizableChange = (index: number, checked: boolean) => {
    const component = components[index];
    if (checked) {
      // When enabling customization, clear the fixed material and add first option
      updateComponent(index, { 
        is_customizable: true,
        material_id: undefined, // Clear fixed material
        options: [{
          material_id: component.material_id || '',
          option_name: 'Default Option',
          quantity_required: component.quantity_required,
          is_default: true,
          price_adjustment: 0
        }]
      });
    } else {
      // When disabling, set the default option's material as the fixed material
      const defaultOption = component.options?.find(o => o.is_default) || component.options?.[0];
      updateComponent(index, { 
        is_customizable: false,
        material_id: defaultOption?.material_id || undefined,
        options: []
      });
    }
  };

  // Get effective cost for a material based on costing_method
  const getMaterialEffectiveCost = (material: { cost_price: number; avg_cost?: number; costing_method?: string }) => {
    if (material.costing_method === 'exact') {
      return material.cost_price || material.avg_cost || 0;
    }
    return material.avg_cost || material.cost_price || 0;
  };

  // Get material availability display text
  const getMaterialAvailabilityText = (material: { name: string; quantity_available?: number | null; unit?: string | null; cost_price: number; avg_cost?: number; costing_method?: string }) => {
    const qty = material.quantity_available ?? 0;
    const unit = material.unit || 'units';
    const cost = getMaterialEffectiveCost(material);
    const costLabel = material.costing_method === 'exact' ? 'exact' : 'avg';
    return `${material.name} - ${qty} ${unit} available (₹${cost}/${unit} ${costLabel})`;
  };

  // Check if material is low stock
  const getMaterialStockStatus = (material: { quantity_available?: number | null }) => {
    const qty = material.quantity_available ?? 0;
    if (qty <= 0) return 'out-of-stock';
    if (qty < 10) return 'low-stock';
    return 'in-stock';
  };

  // Validate all component types
  const getComponentValidation = (component: CreateBOMComponentData) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (component.component_type === 'material') {
      if (component.is_customizable) {
        if (!component.options || component.options.length < 2) {
          errors.push('Customizable components must have at least 2 options');
        }
        if (component.options?.some(o => !o.material_id || !o.option_name)) {
          errors.push('All options must have a material and name');
        }
        if (!component.options?.some(o => o.is_default)) {
          warnings.push('No default option selected - first option will be used');
        }
      } else {
        if (!component.material_id) {
          errors.push('Fixed components must have a material selected');
        }
      }
    } else if (component.component_type === 'labor') {
      if (!component.labor_category_id) {
        errors.push('Labor components must have a category selected');
      }
      const totalMinutes = (component.time_hours || 0) * 60 + (component.time_minutes || 0);
      if (totalMinutes <= 0) {
        errors.push('Labor components must have time specified (hours or minutes)');
      }
    } else if (component.component_type === 'service') {
      if (component.service_cost_type === 'percentage') {
        if (!component.service_cost || component.service_cost <= 0) {
          errors.push('Percentage-based service must have a percentage greater than zero');
        }
      } else {
        if (!component.service_cost || component.service_cost <= 0) {
          errors.push('Service components must have a cost greater than zero');
        }
      }
    }
    
    return { errors, warnings };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">BOM Components</h3>
          <p className="text-sm text-muted-foreground">
            Define fixed materials and customizable options for this product
          </p>
        </div>
        <Button onClick={addComponent} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Component
        </Button>
      </div>

      {components.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground mb-4">No components added yet</p>
            <Button onClick={addComponent} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add First Component
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {components.map((component, index) => {
            const validation = getComponentValidation(component);
            
            return (
              <Card key={index} className={validation.errors.length > 0 ? 'border-destructive' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {component.component_name || `Component ${index + 1}`}
                      </CardTitle>
                      {component.is_customizable ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          Customizable ({component.options?.length || 0} options)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Fixed
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeComponent(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Validation errors */}
                  {validation.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside">
                          {validation.errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validation.warnings.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {validation.warnings.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`component-name-${index}`}>Component Name</Label>
                      <Input
                        id={`component-name-${index}`}
                        value={component.component_name || ''}
                        onChange={(e) => updateComponent(index, { component_name: e.target.value })}
                        placeholder="e.g., Upholstery Fabric, Frame Wood"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`component-type-${index}`}>Component Type</Label>
                      <Select
                        value={component.component_type}
                        onValueChange={(value: 'material' | 'labor' | 'service') => 
                          updateComponent(index, { 
                            component_type: value, 
                            is_customizable: value === 'material' ? component.is_customizable : false,
                            // Reset type-specific fields when changing type
                            material_id: value === 'material' ? component.material_id : undefined,
                            labor_category_id: value === 'labor' ? component.labor_category_id : undefined,
                            service_cost: value === 'service' ? component.service_cost : undefined,
                            time_hours: value === 'labor' ? (component.time_hours || 0) : undefined,
                            time_minutes: value === 'labor' ? (component.time_minutes || 0) : undefined,
                            quantity_required: value === 'material' ? component.quantity_required : 1
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="material">Material - Physical items from inventory</SelectItem>
                          <SelectItem value="labor">Labor - Work hours (e.g., carpentry, painting)</SelectItem>
                          <SelectItem value="service">Service - Fixed-cost services</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {component.component_type === 'material' && (
                    <>
                      {/* Customizable Toggle - Prominent placement */}
                      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                        <div className="space-y-0.5">
                          <Label htmlFor={`customizable-${index}`} className="text-base font-medium">
                            Allow Customer Customization
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {component.is_customizable 
                              ? "Customer can choose from multiple material options (e.g., fabric colors)"
                              : "This component uses a fixed material for all orders"}
                          </p>
                        </div>
                        <Switch
                          id={`customizable-${index}`}
                          checked={component.is_customizable}
                          onCheckedChange={(checked) => handleCustomizableChange(index, checked)}
                        />
                      </div>

                      {!component.is_customizable ? (
                        /* FIXED COMPONENT: Single material selection */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border">
                          <div>
                            <Label htmlFor={`material-${index}`}>Material (Fixed)</Label>
                            <Select
                              value={component.material_id || ''}
                              onValueChange={(value) => updateComponent(index, { material_id: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select fixed material" />
                              </SelectTrigger>
                              <SelectContent>
                                {materials.map((material) => {
                                  const stockStatus = getMaterialStockStatus(material);
                                  return (
                                    <SelectItem key={material.id} value={material.id}>
                                      <div className="flex items-center gap-2">
                                        <span className={stockStatus === 'out-of-stock' ? 'text-destructive' : stockStatus === 'low-stock' ? 'text-yellow-600' : ''}>
                                          {getMaterialAvailabilityText(material)}
                                        </span>
                                        {stockStatus === 'out-of-stock' && (
                                          <Badge variant="destructive" className="text-xs">Out</Badge>
                                        )}
                                        {stockStatus === 'low-stock' && (
                                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Low</Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor={`quantity-${index}`}>Quantity Required</Label>
                            <Input
                              id={`quantity-${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={component.quantity_required}
                              onChange={(e) => updateComponent(index, { quantity_required: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                      ) : (
                        /* CUSTOMIZABLE COMPONENT: Multiple options */
                        <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base font-medium">Material Options</Label>
                              <p className="text-sm text-muted-foreground">
                                Add at least 2 options. Mark one as default for cost calculation.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addOption(index)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Option
                            </Button>
                          </div>
                          
                          <div className="space-y-3">
                            {(component.options || []).map((option, optionIndex) => {
                              const selectedMaterial = materials.find(m => m.id === option.material_id);
                              
                              return (
                                <div key={optionIndex} className="p-3 rounded-md border bg-background space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">Option {optionIndex + 1}</span>
                                      {option.is_default && (
                                        <Badge variant="default" className="flex items-center gap-1">
                                          <Star className="h-3 w-3" />
                                          Default
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {!option.is_default && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => updateOption(index, optionIndex, { is_default: true })}
                                          title="Set as default"
                                        >
                                          <Star className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeOption(index, optionIndex)}
                                        disabled={(component.options?.length || 0) <= 1}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">Option Name</Label>
                                      <Input
                                        value={option.option_name}
                                        onChange={(e) => updateOption(index, optionIndex, { option_name: e.target.value })}
                                        placeholder="e.g., Red Velvet, Blue Linen"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Material</Label>
                                      <Select
                                        value={option.material_id}
                                        onValueChange={(value) => updateOption(index, optionIndex, { material_id: value })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select material" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {materials.map((material) => {
                                            const stockStatus = getMaterialStockStatus(material);
                                            return (
                                              <SelectItem key={material.id} value={material.id}>
                                                <div className="flex items-center gap-2">
                                                  <span className={stockStatus === 'out-of-stock' ? 'text-destructive' : stockStatus === 'low-stock' ? 'text-yellow-600' : ''}>
                                                    {getMaterialAvailabilityText(material)}
                                                  </span>
                                                  {stockStatus === 'out-of-stock' && (
                                                    <Badge variant="destructive" className="text-xs">Out</Badge>
                                                  )}
                                                  {stockStatus === 'low-stock' && (
                                                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Low</Badge>
                                                  )}
                                                </div>
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">Quantity Required</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={option.quantity_required ?? component.quantity_required}
                                        onChange={(e) => updateOption(index, optionIndex, { 
                                          quantity_required: parseFloat(e.target.value) || null 
                                        })}
                                        placeholder={`Default: ${component.quantity_required}`}
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {selectedMaterial?.unit || 'units'} per product
                                      </p>
                                    </div>
                                    <div>
                                      <Label className="text-xs">Price Adjustment (₹)</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={option.price_adjustment || 0}
                                        onChange={(e) => updateOption(index, optionIndex, { 
                                          price_adjustment: parseFloat(e.target.value) || 0 
                                        })}
                                        placeholder="0"
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {(option.price_adjustment || 0) > 0 ? 'Surcharge' : (option.price_adjustment || 0) < 0 ? 'Discount' : 'No adjustment'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {(component.options?.length || 0) < 2 && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Add at least 2 options for customizable components
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {component.component_type === 'labor' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`labor-category-${index}`}>Labor Category</Label>
                          <Select
                            value={component.labor_category_id || ''}
                            onValueChange={(value) => updateComponent(index, { labor_category_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {laborCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name} (₹{category.default_hourly_rate}/hr)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor={`time-hours-${index}`}>Hours</Label>
                          <Input
                            id={`time-hours-${index}`}
                            type="number"
                            min="0"
                            value={component.time_hours || 0}
                            onChange={(e) => updateComponent(index, { time_hours: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`time-minutes-${index}`}>Minutes</Label>
                          <Input
                            id={`time-minutes-${index}`}
                            type="number"
                            min="0"
                            max="59"
                            value={component.time_minutes || 0}
                            onChange={(e) => updateComponent(index, { time_minutes: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor={`hourly-rate-${index}`}>Custom Hourly Rate (optional)</Label>
                        <Input
                          id={`hourly-rate-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={component.hourly_rate || ''}
                          onChange={(e) => updateComponent(index, { hourly_rate: parseFloat(e.target.value) || undefined })}
                          placeholder="Leave empty to use category default"
                        />
                      </div>
                    </>
                  )}

                  {component.component_type === 'service' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`service-cost-type-${index}`}>Cost Type</Label>
                          <Select
                            value={component.service_cost_type || 'fixed'}
                            onValueChange={(value: 'fixed' | 'percentage') => 
                              updateComponent(index, { service_cost_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                              <SelectItem value="percentage">Percentage of Subtotal (%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`service-cost-${index}`}>
                            {component.service_cost_type === 'percentage' ? 'Percentage (%)' : 'Service Cost (₹)'}
                          </Label>
                          <Input
                            id={`service-cost-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={component.service_cost || 0}
                            onChange={(e) => updateComponent(index, { service_cost: parseFloat(e.target.value) || 0 })}
                            placeholder={component.service_cost_type === 'percentage' ? 'e.g., 2 for 2%' : '0.00'}
                          />
                          {component.service_cost_type === 'percentage' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Applied on material + labor subtotal
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor={`notes-${index}`}>Notes</Label>
                    <Textarea
                      id={`notes-${index}`}
                      value={component.notes || ''}
                      onChange={(e) => updateComponent(index, { notes: e.target.value })}
                      placeholder="Any additional notes..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};