import { useState } from 'react';
import { ArrowUpDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useMaterials } from '@/hooks/useMaterials';

interface AlternativeMaterial {
  id: string;
  material_id: string;
  material_name: string;
  conversion_factor: number;
  cost_difference: number;
  notes?: string;
}

interface AlternativeMaterialsProps {
  componentId: string;
  primaryMaterialId: string;
  alternatives: AlternativeMaterial[];
  onAddAlternative: (alternative: Omit<AlternativeMaterial, 'id'>) => void;
  onRemoveAlternative: (alternativeId: string) => void;
}

export function AlternativeMaterials({ 
  componentId, 
  primaryMaterialId, 
  alternatives, 
  onAddAlternative, 
  onRemoveAlternative 
}: AlternativeMaterialsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [conversionFactor, setConversionFactor] = useState(1);
  const [notes, setNotes] = useState('');
  const { data: materials = [] } = useMaterials();

  const availableMaterials = materials.filter(
    m => m.id !== primaryMaterialId && 
    !alternatives.some(alt => alt.material_id === m.id)
  );

  const handleAddAlternative = () => {
    const selectedMaterial = materials.find(m => m.id === selectedMaterialId);
    if (!selectedMaterial) return;

    const primaryMaterial = materials.find(m => m.id === primaryMaterialId);
    const costDifference = primaryMaterial 
      ? (selectedMaterial.cost_price * conversionFactor) - primaryMaterial.cost_price
      : 0;

    onAddAlternative({
      material_id: selectedMaterialId,
      material_name: selectedMaterial.name,
      conversion_factor: conversionFactor,
      cost_difference: costDifference,
      notes
    });

    // Reset form
    setSelectedMaterialId('');
    setConversionFactor(1);
    setNotes('');
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-blue-200">Alternative Materials</Label>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Add Alternative
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-blue-500/30">
            <DialogHeader>
              <DialogTitle className="text-cyan-300">Add Alternative Material</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Material</Label>
                <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                  <SelectTrigger className="bg-slate-700/50 border-blue-500/30">
                    <SelectValue placeholder="Select alternative material" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMaterials.map(material => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} (₹{material.cost_price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Conversion Factor</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(parseFloat(e.target.value) || 1)}
                  className="bg-slate-700/50 border-blue-500/30"
                  placeholder="1.0"
                />
                <p className="text-xs text-blue-300 mt-1">
                  Ratio: 1 unit of primary = {conversionFactor} units of alternative
                </p>
              </div>
              
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-slate-700/50 border-blue-500/30"
                  placeholder="Usage notes or conditions"
                />
              </div>
              
              <Button 
                onClick={handleAddAlternative} 
                disabled={!selectedMaterialId}
                className="w-full"
              >
                Add Alternative
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {alternatives.length > 0 && (
        <div className="space-y-2">
          {alternatives.map((alternative) => (
            <div 
              key={alternative.id} 
              className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-blue-500/20"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3 h-3 text-blue-400" />
                  <span className="text-sm text-blue-200">{alternative.material_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {alternative.conversion_factor}x
                  </Badge>
                  {alternative.cost_difference > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      +₹{alternative.cost_difference.toFixed(2)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-300">
                      -₹{Math.abs(alternative.cost_difference).toFixed(2)}
                    </Badge>
                  )}
                </div>
                {alternative.notes && (
                  <p className="text-xs text-gray-400 mt-1">{alternative.notes}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveAlternative(alternative.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}