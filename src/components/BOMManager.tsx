import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBOMByItem, useCreateBOM, useUpdateBOM } from '@/hooks/useBOM';
import { useMaterials } from '@/hooks/useMaterials';
import { type Item } from '@/hooks/useItems';

interface BOMManagerProps {
  item: Item;
}

interface BOMComponentForm {
  material_id: string;
  quantity_required: number;
  component_name?: string;
  is_customizable: boolean;
  notes?: string;
}

export default function BOMManager({ item }: BOMManagerProps) {
  const { data: bom, isLoading: bomLoading } = useBOMByItem(item.id);
  const { data: materials = [] } = useMaterials();
  const createBOM = useCreateBOM();
  const updateBOM = useUpdateBOM();
  
  const [components, setComponents] = useState<BOMComponentForm[]>([]);
  const [bomName, setBomName] = useState('');

  useEffect(() => {
    if (bom) {
      setBomName(bom.name || '');
      setComponents(bom.bom_components.map(comp => ({
        material_id: comp.material_id,
        quantity_required: comp.quantity_required,
        component_name: comp.component_name,
        is_customizable: comp.is_customizable,
        notes: comp.notes
      })));
    }
  }, [bom]);

  const addComponent = () => {
    setComponents([...components, { material_id: '', quantity_required: 1, component_name: '', is_customizable: false, notes: '' }]);
  };

  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponent = (index: number, field: keyof BOMComponentForm, value: string | number) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    setComponents(updated);
  };

  const handleSave = async () => {
    const validComponents = components.filter(comp => 
      comp.material_id && comp.quantity_required > 0
    );

    if (validComponents.length === 0) {
      alert('Please add at least one valid component');
      return;
    }

    try {
      if (bom) {
        await updateBOM.mutateAsync({
          bomId: bom.id,
          itemId: item.id,
          components: validComponents
        });
      } else {
        await createBOM.mutateAsync({
          item_id: item.id,
          name: bomName,
          components: validComponents
        });
      }
    } catch (error) {
      console.error('Error saving BOM:', error);
    }
  };

  const checkMaterialAvailability = (materialId: string, quantityNeeded: number) => {
    const material = materials.find(m => m.id === materialId);
    if (!material) return { available: false, shortage: 0 };
    
    const available = material.quantity_available >= quantityNeeded;
    const shortage = available ? 0 : quantityNeeded - material.quantity_available;
    
    return { available, shortage };
  };

  if (bomLoading) {
    return <div className="text-blue-300">Loading BOM data...</div>;
  }

  return (
    <Card className="futuristic-card">
      <CardHeader>
        <CardTitle className="text-cyan-300 glow-text flex items-center gap-2">
          <Package className="w-5 h-5" />
          Bill of Materials (BOM)
        </CardTitle>
        <p className="text-blue-200 text-sm">
          Define the materials required to build one unit of "{item.name}"
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-blue-200">Materials Required</Label>
            <Button 
              type="button" 
              onClick={addComponent}
              size="sm"
              className="cyber-button text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Material
            </Button>
          </div>

          {components.length === 0 ? (
            <div className="text-center py-8 text-blue-300">
              No materials added yet. Click "Add Material" to start.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-blue-500/30">
                    <TableHead className="text-blue-200">Material</TableHead>
                    <TableHead className="text-blue-200">Quantity Required</TableHead>
                    <TableHead className="text-blue-200">Unit</TableHead>
                    <TableHead className="text-blue-200">Availability</TableHead>
                    <TableHead className="text-blue-200">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map((component, index) => {
                    const material = materials.find(m => m.id === component.material_id);
                    const { available, shortage } = checkMaterialAvailability(
                      component.material_id, 
                      component.quantity_required
                    );

                    return (
                      <TableRow key={index} className="border-blue-500/20">
                        <TableCell>
                          <Select 
                            value={component.material_id} 
                            onValueChange={(value) => updateComponent(index, 'material_id', value)}
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
                                  {material.name} (Stock: {material.quantity_available})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={component.quantity_required || ''}
                            onChange={(e) => updateComponent(index, 'quantity_required', parseFloat(e.target.value) || 0)}
                            className="neon-border bg-slate-800/50 text-blue-100"
                          />
                        </TableCell>
                        <TableCell className="text-blue-200">
                          {material?.unit || 'Units'}
                        </TableCell>
                        <TableCell>
                          {component.material_id && component.quantity_required > 0 ? (
                            available ? (
                              <span className="text-green-400">✓ Available</span>
                            ) : (
                              <span className="text-red-400">⚠ Short by {shortage.toFixed(2)}</span>
                            )
                          ) : (
                            <span className="text-blue-300">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeComponent(index)}
                            className="neon-border bg-slate-800/50 text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Material shortage warning */}
        {components.some(comp => {
          const { available } = checkMaterialAvailability(comp.material_id, comp.quantity_required);
          return comp.material_id && comp.quantity_required > 0 && !available;
        }) && (
          <Alert className="neon-border bg-red-900/20 border-red-500/30">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              Some materials are not available in sufficient quantities. Please restock before production.
            </AlertDescription>
          </Alert>
        )}

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