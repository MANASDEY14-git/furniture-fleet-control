import { useState } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CreateBOMComponentData } from '@/types/bom';
import { useMaterials } from '@/hooks/useMaterials';

interface BOMComponentsStepProps {
  components: CreateBOMComponentData[];
  onChange: (components: CreateBOMComponentData[]) => void;
}

export function BOMComponentsStep({ components, onChange }: BOMComponentsStepProps) {
  const { data: materials = [] } = useMaterials();

  const addComponent = () => {
    const newComponent: CreateBOMComponentData = {
      material_id: '',
      quantity_required: 1,
      component_name: '',
      is_customizable: false,
      notes: '',
      options: []
    };
    onChange([...components, newComponent]);
  };

  const updateComponent = (index: number, updates: Partial<CreateBOMComponentData>) => {
    const updated = [...components];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeComponent = (index: number) => {
    onChange(components.filter((_, i) => i !== index));
  };

  const addOption = (componentIndex: number) => {
    const updated = [...components];
    if (!updated[componentIndex].options) {
      updated[componentIndex].options = [];
    }
    updated[componentIndex].options!.push({ material_id: '', option_name: '' });
    onChange(updated);
  };

  const updateOption = (componentIndex: number, optionIndex: number, field: 'material_id' | 'option_name', value: string) => {
    const updated = [...components];
    updated[componentIndex].options![optionIndex][field] = value;
    onChange(updated);
  };

  const removeOption = (componentIndex: number, optionIndex: number) => {
    const updated = [...components];
    updated[componentIndex].options = updated[componentIndex].options!.filter((_, i) => i !== optionIndex);
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Components & Materials</h3>
        <p className="text-sm text-muted-foreground">
          Add the materials and components needed for this product
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Components ({components.length})</Label>
        <Button onClick={addComponent} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Component
        </Button>
      </div>

      {components.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <h4 className="text-lg font-medium text-foreground mb-2">No components added</h4>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Start building your BOM by adding the first component
            </p>
            <Button onClick={addComponent} className="gap-2">
              <Plus className="w-4 h-4" />
              Add First Component
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {components.map((component, index) => (
            <Card key={index} className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Component #{index + 1}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeComponent(index)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Component Name</Label>
                    <Input
                      placeholder="e.g., Frame Material, Fabric"
                      value={component.component_name || ''}
                      onChange={(e) => updateComponent(index, { component_name: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id={`customizable-${index}`}
                      checked={component.is_customizable}
                      onCheckedChange={(checked) => 
                        updateComponent(index, { is_customizable: checked as boolean })
                      }
                    />
                    <Label htmlFor={`customizable-${index}`}>
                      Customizable by customer
                    </Label>
                  </div>
                </div>

                {!component.is_customizable ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fixed Material *</Label>
                      <Select 
                        value={component.material_id} 
                        onValueChange={(value) => updateComponent(index, { material_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((material) => (
                            <SelectItem key={material.id} value={material.id}>
                              {material.name} (Stock: {material.quantity_available})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity Required *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={component.quantity_required || ''}
                        onChange={(e) => updateComponent(index, { quantity_required: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Customization Options</Label>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addOption(index)}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Option
                      </Button>
                    </div>

                    {component.options && component.options.length > 0 ? (
                      <div className="space-y-2">
                        {component.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Material</Label>
                              <Select 
                                value={option.material_id} 
                                onValueChange={(value) => updateOption(index, optionIndex, 'material_id', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select material" />
                                </SelectTrigger>
                                <SelectContent>
                                  {materials.map((material) => (
                                    <SelectItem key={material.id} value={material.id}>
                                      {material.name} (Stock: {material.quantity_available})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Option Name</Label>
                              <Input
                                placeholder="e.g., Red Fabric, Blue Glass"
                                value={option.option_name}
                                onChange={(e) => updateOption(index, optionIndex, 'option_name', e.target.value)}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeOption(index, optionIndex)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No customization options added yet
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Quantity per Unit *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Quantity used per product unit"
                        value={component.quantity_required || ''}
                        onChange={(e) => updateComponent(index, { quantity_required: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes for this component"
                    value={component.notes || ''}
                    onChange={(e) => updateComponent(index, { notes: e.target.value })}
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
}