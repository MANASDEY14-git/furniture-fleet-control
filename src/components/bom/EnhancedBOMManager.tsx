import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, AlertTriangle, Settings, Eye, Clock, Wrench, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { useEnhancedBOMByItem, useCreateEnhancedBOM, useUpdateEnhancedBOM } from '@/hooks/useEnhancedBOM';
import { CreateBOMComponentData } from '@/types/bom';
import { useMaterials } from '@/hooks/useMaterials';
import { useLaborCategories } from '@/hooks/useLaborCategories';
import { type Item } from '@/hooks/useItems';

interface EnhancedBOMManagerProps {
  item: Item;
}

interface BOMComponentFormData {
  id?: string;
  material_id?: string;
  quantity_required: number;
  component_name?: string;
  is_customizable: boolean;
  notes?: string;
  component_type: 'material' | 'labor' | 'service';
  time_hours?: number;
  time_minutes?: number;
  hourly_rate?: number;
  service_cost?: number;
  labor_category_id?: string;
  options?: {
    material_id: string;
    option_name: string;
  }[];
}

export default function EnhancedBOMManager({ item }: EnhancedBOMManagerProps) {
  const { data: bom, isLoading: bomLoading } = useEnhancedBOMByItem(item.id);
  const { data: materials = [] } = useMaterials();
  const { data: laborCategories = [] } = useLaborCategories();
  const createBOM = useCreateEnhancedBOM();
  const updateBOM = useUpdateEnhancedBOM();
  
  const [components, setComponents] = useState<BOMComponentFormData[]>([]);
  const [bomName, setBomName] = useState('');

  useEffect(() => {
    if (bom) {
      setBomName(bom.name || '');
      setComponents(bom.bom_components.map(comp => ({
        id: comp.id,
        material_id: comp.material_id || undefined,
        quantity_required: comp.quantity_required,
        component_name: comp.component_name || undefined,
        is_customizable: comp.is_customizable,
        notes: comp.notes || undefined,
        component_type: comp.component_type || 'material',
        time_hours: comp.time_hours || undefined,
        time_minutes: comp.time_minutes || undefined,
        hourly_rate: comp.hourly_rate || undefined,
        service_cost: comp.service_cost || undefined,
        labor_category_id: comp.labor_category_id || undefined,
        options: comp.bom_component_options?.map(opt => ({
          material_id: opt.material_id,
          option_name: opt.option_name
        })) || []
      })));
    }
  }, [bom]);

  const addComponent = () => {
    setComponents([...components, { 
      material_id: undefined, 
      quantity_required: 1, 
      component_name: '',
      is_customizable: false,
      notes: '',
      component_type: 'material',
      options: []
    }]);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, updates: Partial<BOMComponentFormData>) => {
    const updated = [...components];
    updated[index] = { ...updated[index], ...updates };
    setComponents(updated);
  };

  const addOption = (componentIndex: number) => {
    const updated = [...components];
    if (!updated[componentIndex].options) {
      updated[componentIndex].options = [];
    }
    updated[componentIndex].options!.push({ material_id: '', option_name: '' });
    setComponents(updated);
  };

  const removeOption = (componentIndex: number, optionIndex: number) => {
    const updated = [...components];
    updated[componentIndex].options = updated[componentIndex].options!.filter((_, i) => i !== optionIndex);
    setComponents(updated);
  };

  const updateOption = (componentIndex: number, optionIndex: number, field: 'material_id' | 'option_name', value: string) => {
    const updated = [...components];
    updated[componentIndex].options![optionIndex][field] = value;
    setComponents(updated);
  };

  const validateComponent = (comp: BOMComponentFormData): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Common validations
    if (!comp.component_name?.trim()) {
      errors.push('Component name is required');
    }
    
    if (!comp.component_type) {
      errors.push('Component type is required');
    }

    // Type-specific validations
    if (comp.component_type === 'material') {
      if (comp.is_customizable) {
        if (!comp.options || comp.options.length === 0) {
          errors.push('At least one customization option is required');
        } else if (!comp.options.every(opt => opt.material_id && opt.option_name)) {
          errors.push('All customization options must have material and option name');
        }
      } else {
        if (!comp.material_id) {
          errors.push('Material selection is required');
        }
      }
      if (!comp.quantity_required || comp.quantity_required <= 0) {
        errors.push('Quantity required must be greater than 0');
      }
    } else if (comp.component_type === 'labor') {
      if (!comp.time_hours || comp.time_hours <= 0) {
        errors.push('Time hours must be greater than 0');
      }
      if (!comp.hourly_rate || comp.hourly_rate <= 0) {
        errors.push('Hourly rate must be greater than 0');
      }
      if (comp.time_minutes && (comp.time_minutes < 0 || comp.time_minutes > 59)) {
        errors.push('Time minutes must be between 0 and 59');
      }
    } else if (comp.component_type === 'service') {
      if (!comp.service_cost || comp.service_cost <= 0) {
        errors.push('Service cost must be greater than 0');
      }
      if (!comp.quantity_required || comp.quantity_required <= 0) {
        errors.push('Service quantity/units must be greater than 0');
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleSave = async () => {
    const componentValidations = components.map((comp, index) => ({
      index,
      component: comp,
      validation: validateComponent(comp)
    }));

    const invalidComponents = componentValidations.filter(cv => !cv.validation.isValid);
    
    if (invalidComponents.length > 0) {
      const errorMessage = invalidComponents.map(cv => 
        `Component #${cv.index + 1}: ${cv.validation.errors.join(', ')}`
      ).join('\n');
      
      alert(`Please fix the following errors:\n\n${errorMessage}`);
      return;
    }

    const validComponents = componentValidations.map(cv => cv.component);

    if (validComponents.length === 0) {
      alert('Please add at least one valid component');
      return;
    }

    // Convert to the format expected by the API
    const apiComponents: CreateBOMComponentData[] = validComponents.map(comp => ({
      material_id: comp.material_id,
      quantity_required: comp.quantity_required,
      component_name: comp.component_name,
      is_customizable: comp.is_customizable,
      notes: comp.notes,
      component_type: comp.component_type,
      time_hours: comp.time_hours,
      time_minutes: comp.time_minutes,
      hourly_rate: comp.hourly_rate,
      service_cost: comp.service_cost,
      labor_category_id: comp.labor_category_id,
      options: comp.options
    }));

    try {
      if (bom) {
        await updateBOM.mutateAsync({
          bomId: bom.id,
          itemId: item.id,
          components: apiComponents
        });
      } else {
        await createBOM.mutateAsync({
          item_id: item.id,
          name: bomName,
          components: apiComponents
        });
      }
    } catch (error) {
      console.error('Error saving BOM:', error);
    }
  };

  const getMaterialName = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    return material ? `${material.name} (Stock: ${material.quantity_available})` : 'Select material';
  };

  if (bomLoading) {
    return <div className="text-blue-300">Loading BOM data...</div>;
  }

  return (
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
          <Package className="w-5 h-5" />
          Enhanced Bill of Materials (BOM)
        </CardTitle>
        <p className="text-blue-200 text-sm">
          Define fixed and customizable materials for "{item.name}"
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="bomName" className="text-blue-200">BOM Name (Optional)</Label>
          <Input
            id="bomName"
            placeholder="Enter BOM name"
            value={bomName}
            onChange={(e) => setBomName(e.target.value)}
            className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-blue-200">Materials & Components</Label>
            <Button 
              type="button" 
              onClick={addComponent}
              size="sm"
              className="cyber-button text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Component
            </Button>
          </div>

          {components.length === 0 ? (
            <div className="text-center py-8 text-blue-300">
              No components added yet. Click "Add Component" to start.
            </div>
          ) : (
            <div className="space-y-4">
              {components.map((component, index) => (
                <Card key={index} className="neon-border bg-slate-800/30">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-blue-200 font-medium">
                        Component #{index + 1}
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeComponent(index)}
                        className="neon-border bg-slate-800/50 text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Component Type Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-blue-200">Component Type *</Label>
                        <Select 
                          value={component.component_type} 
                          onValueChange={(value: 'material' | 'labor' | 'service') => 
                            updateComponent(index, { 
                              component_type: value,
                              // Clear type-specific fields when changing type
                              material_id: value === 'material' ? component.material_id : undefined,
                              labor_category_id: value === 'labor' ? component.labor_category_id : undefined,
                              time_hours: value === 'labor' ? component.time_hours : undefined,
                              time_minutes: value === 'labor' ? component.time_minutes : undefined,
                              hourly_rate: value === 'labor' ? component.hourly_rate : undefined,
                              service_cost: value === 'service' ? component.service_cost : undefined,
                            })
                          }
                        >
                          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-blue-500/30">
                            <SelectItem value="material" className="text-blue-100 focus:bg-blue-800/30">
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="w-4 h-4" />
                                Material
                              </div>
                            </SelectItem>
                            <SelectItem value="labor" className="text-blue-100 focus:bg-blue-800/30">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Labor/Time
                              </div>
                            </SelectItem>
                            <SelectItem value="service" className="text-blue-100 focus:bg-blue-800/30">
                              <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4" />
                                Service
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-blue-200">Component Name *</Label>
                        <Input
                          placeholder={
                            component.component_type === 'material' ? 'e.g., Polish, Glass top' :
                            component.component_type === 'labor' ? 'e.g., PU finish, Assembly' :
                            'e.g., Delivery, Installation'
                          }
                          value={component.component_name || ''}
                          onChange={(e) => updateComponent(index, { component_name: e.target.value })}
                          className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-6">
                        <Checkbox
                          id={`customizable-${index}`}
                          checked={component.is_customizable}
                          onCheckedChange={(checked) => 
                            updateComponent(index, { is_customizable: checked as boolean })
                          }
                          disabled={component.component_type !== 'material'}
                        />
                        <Label htmlFor={`customizable-${index}`} className="text-blue-200">
                          <span className={component.component_type !== 'material' ? 'opacity-50' : ''}>
                            Customizable
                          </span>
                        </Label>
                      </div>
                    </div>

                    {/* Component Type Badge */}
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={component.component_type === 'material' ? 'default' : 
                                component.component_type === 'labor' ? 'secondary' : 'outline'}
                        className={
                          component.component_type === 'material' ? 'bg-blue-600 text-white' :
                          component.component_type === 'labor' ? 'bg-amber-600 text-white' :
                          'bg-purple-600 text-white'
                        }
                      >
                        {component.component_type === 'material' && <ShoppingCart className="w-3 h-3 mr-1" />}
                        {component.component_type === 'labor' && <Clock className="w-3 h-3 mr-1" />}
                        {component.component_type === 'service' && <Wrench className="w-3 h-3 mr-1" />}
                        {component.component_type.charAt(0).toUpperCase() + component.component_type.slice(1)} Component
                      </Badge>
                    </div>

                    {/* Component Type Specific Fields */}
                    {component.component_type === 'material' && !component.is_customizable && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-blue-200">Material *</Label>
                          <Select 
                            value={component.material_id || ''} 
                            onValueChange={(value) => updateComponent(index, { material_id: value })}
                          >
                            <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-blue-500/30">
                              {materials.map((material) => (
                                <SelectItem 
                                  key={material.id} 
                                  value={material.id} 
                                  className="text-blue-100 focus:bg-blue-800/30"
                                >
                                  {getMaterialName(material.id)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-blue-200">Quantity Required *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={component.quantity_required || ''}
                            onChange={(e) => updateComponent(index, { quantity_required: parseFloat(e.target.value) || 0 })}
                            className="neon-border bg-slate-800/50 text-blue-100"
                          />
                        </div>
                      </div>
                    )}

                    {component.component_type === 'labor' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-blue-200">Labor Category</Label>
                            <Select 
                              value={component.labor_category_id || ''} 
                              onValueChange={(value) => {
                                const category = laborCategories.find(c => c.id === value);
                                updateComponent(index, { 
                                  labor_category_id: value,
                                  hourly_rate: category?.default_hourly_rate || component.hourly_rate
                                });
                              }}
                            >
                              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-blue-500/30">
                                {laborCategories.map((category) => (
                                  <SelectItem 
                                    key={category.id} 
                                    value={category.id} 
                                    className="text-blue-100 focus:bg-blue-800/30"
                                  >
                                    {category.name} (₹{category.default_hourly_rate}/hr)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-blue-200">Hourly Rate *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Rate per hour"
                              value={component.hourly_rate || ''}
                              onChange={(e) => updateComponent(index, { hourly_rate: parseFloat(e.target.value) || 0 })}
                              className="neon-border bg-slate-800/50 text-blue-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-blue-200">Time Hours *</Label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="e.g., 35"
                              value={component.time_hours || ''}
                              onChange={(e) => updateComponent(index, { time_hours: parseInt(e.target.value) || 0 })}
                              className="neon-border bg-slate-800/50 text-blue-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-blue-200">Time Minutes</Label>
                            <Input
                              type="number"
                              min="0"
                              max="59"
                              placeholder="e.g., 30"
                              value={component.time_minutes || ''}
                              onChange={(e) => updateComponent(index, { time_minutes: parseInt(e.target.value) || 0 })}
                              className="neon-border bg-slate-800/50 text-blue-100"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-blue-200">Total Cost</Label>
                            <div className="p-2 bg-slate-700/50 rounded border border-blue-500/30 text-blue-100">
                              ₹{((component.time_hours || 0) + (component.time_minutes || 0) / 60) * (component.hourly_rate || 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {component.component_type === 'service' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-blue-200">Service Cost *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Total service cost"
                            value={component.service_cost || ''}
                            onChange={(e) => updateComponent(index, { service_cost: parseFloat(e.target.value) || 0 })}
                            className="neon-border bg-slate-800/50 text-blue-100"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-blue-200">Quantity/Units *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Number of service units"
                            value={component.quantity_required || ''}
                            onChange={(e) => updateComponent(index, { quantity_required: parseFloat(e.target.value) || 0 })}
                            className="neon-border bg-slate-800/50 text-blue-100"
                          />
                        </div>
                      </div>
                    )}

                    {component.component_type === 'material' && component.is_customizable && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-blue-200">Customization Options</Label>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => addOption(index)}
                            className="cyber-button text-white font-semibold"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Option
                          </Button>
                        </div>

                        {component.options && component.options.length > 0 ? (
                          <div className="space-y-2">
                            {component.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex gap-2 items-end">
                                <div className="flex-1 space-y-1">
                                  <Label className="text-blue-200 text-xs">Material</Label>
                                  <Select 
                                    value={option.material_id} 
                                    onValueChange={(value) => updateOption(index, optionIndex, 'material_id', value)}
                                  >
                                    <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                                      <SelectValue placeholder="Select material" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-blue-500/30">
                                      {materials.map((material) => (
                                        <SelectItem 
                                          key={material.id} 
                                          value={material.id} 
                                          className="text-blue-100 focus:bg-blue-800/30"
                                        >
                                          {getMaterialName(material.id)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex-1 space-y-1">
                                  <Label className="text-blue-200 text-xs">Option Name</Label>
                                  <Input
                                    placeholder="e.g., Red Fabric, Blue Glass"
                                    value={option.option_name}
                                    onChange={(e) => updateOption(index, optionIndex, 'option_name', e.target.value)}
                                    className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeOption(index, optionIndex)}
                                  className="neon-border bg-slate-800/50 text-red-400 hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-blue-300 text-sm">
                            No customization options added yet
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-blue-200">Quantity per Unit *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Quantity used per product unit"
                            value={component.quantity_required || ''}
                            onChange={(e) => updateComponent(index, { quantity_required: parseFloat(e.target.value) || 0 })}
                            className="neon-border bg-slate-800/50 text-blue-100"
                          />
                        </div>
                      </div>
                    )}

                    {component.notes !== undefined && (
                      <div className="space-y-2">
                        <Label className="text-blue-200">Notes</Label>
                        <Textarea
                          placeholder="Additional notes for this component"
                          value={component.notes}
                          onChange={(e) => updateComponent(index, { notes: e.target.value })}
                          className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                          rows={2}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSave}
            className="cyber-button text-white font-semibold"
            disabled={createBOM.isPending || updateBOM.isPending}
          >
            {createBOM.isPending || updateBOM.isPending ? 'Saving...' : (bom ? 'Update BOM' : 'Create BOM')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}