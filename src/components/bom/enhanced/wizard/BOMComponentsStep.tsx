import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, X } from 'lucide-react';
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
      component_name: '',
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
    const newOption = { material_id: '', option_name: '' };
    updateComponent(componentIndex, {
      options: [...(component.options || []), newOption]
    });
  };

  const updateOption = (componentIndex: number, optionIndex: number, updates: { material_id?: string; option_name?: string }) => {
    const component = components[componentIndex];
    const updatedOptions = (component.options || []).map((option, i) =>
      i === optionIndex ? { ...option, ...updates } : option
    );
    updateComponent(componentIndex, { options: updatedOptions });
  };

  const removeOption = (componentIndex: number, optionIndex: number) => {
    const component = components[componentIndex];
    const updatedOptions = (component.options || []).filter((_, i) => i !== optionIndex);
    updateComponent(componentIndex, { options: updatedOptions });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">BOM Components</h3>
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
          {components.map((component, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Component {index + 1}</CardTitle>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`component-name-${index}`}>Component Name</Label>
                    <Input
                      id={`component-name-${index}`}
                      value={component.component_name || ''}
                      onChange={(e) => updateComponent(index, { component_name: e.target.value })}
                      placeholder="Enter component name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`component-type-${index}`}>Component Type</Label>
                    <Select
                      value={component.component_type}
                      onValueChange={(value: 'material' | 'labor' | 'service') => 
                        updateComponent(index, { component_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="labor">Labor</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {component.component_type === 'material' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`material-${index}`}>Material</Label>
                        <Select
                          value={component.material_id || ''}
                          onValueChange={(value) => updateComponent(index, { material_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name} ({material.unit})
                              </SelectItem>
                            ))}
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
                  <div>
                    <Label htmlFor={`service-cost-${index}`}>Service Cost</Label>
                    <Input
                      id={`service-cost-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={component.service_cost || 0}
                      onChange={(e) => updateComponent(index, { service_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`customizable-${index}`}
                    checked={component.is_customizable}
                    onCheckedChange={(checked) => updateComponent(index, { is_customizable: checked })}
                  />
                  <Label htmlFor={`customizable-${index}`}>Allow customization</Label>
                </div>

                {component.is_customizable && component.component_type === 'material' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Material Options</Label>
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
                    
                    {(component.options || []).map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <Select
                          value={option.material_id}
                          onValueChange={(value) => updateOption(index, optionIndex, { material_id: value })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select material" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="flex-1"
                          value={option.option_name}
                          onChange={(e) => updateOption(index, optionIndex, { option_name: e.target.value })}
                          placeholder="Option name"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index, optionIndex)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
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
          ))}
        </div>
      )}
    </div>
  );
};