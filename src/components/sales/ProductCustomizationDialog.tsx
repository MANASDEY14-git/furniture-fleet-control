import { useState, useEffect } from 'react';
import { Settings, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBOMByItem } from '@/hooks/useBOM';

interface ProductCustomization {
  componentId: string;
  componentName: string;
  selectedMaterialId: string;
  selectedOptionName: string;
  quantityUsed: number;
}

interface ProductCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  quantity: number;
  onCustomizationComplete: (customizations: ProductCustomization[]) => void;
}

export default function ProductCustomizationDialog({ 
  open, 
  onOpenChange, 
  itemId, 
  itemName, 
  quantity,
  onCustomizationComplete 
}: ProductCustomizationDialogProps) {
  const { data: bom, isLoading } = useBOMByItem(itemId);
  const [customizations, setCustomizations] = useState<ProductCustomization[]>([]);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  const customizableComponents = bom?.bom_components?.filter(comp => comp.is_customizable) || [];

  useEffect(() => {
    if (customizableComponents.length > 0) {
      setCustomizations(customizableComponents.map(comp => ({
        componentId: comp.id,
        componentName: comp.component_name || 'Component',
        selectedMaterialId: '',
        selectedOptionName: '',
        quantityUsed: comp.quantity_required * quantity
      })));
    }
  }, [customizableComponents, quantity]);

  useEffect(() => {
    // Check stock availability for selected materials
    const warnings: string[] = [];
    customizations.forEach(customization => {
      if (customization.selectedMaterialId) {
        // Find the material in the BOM component options
        let materialData = null;
        customizableComponents.forEach(comp => {
          const option = comp.bom_component_options?.find(opt => opt.material_id === customization.selectedMaterialId);
          if (option?.materials) {
            materialData = option.materials;
          }
        });
        
        if (materialData && materialData.quantity_available < customization.quantityUsed) {
          warnings.push(
            `${customization.componentName}: Only ${materialData.quantity_available} ${materialData.unit || 'units'} available, need ${customization.quantityUsed}`
          );
        }
      }
    });
    setStockWarnings(warnings);
  }, [customizations, customizableComponents]);

  const updateCustomization = (componentId: string, materialId: string, optionName: string) => {
    setCustomizations(prev => prev.map(custom => 
      custom.componentId === componentId 
        ? { ...custom, selectedMaterialId: materialId, selectedOptionName: optionName }
        : custom
    ));
  };

  const handleComplete = () => {
    const validCustomizations = customizations.filter(c => c.selectedMaterialId && c.selectedOptionName);
    if (validCustomizations.length === customizableComponents.length) {
      onCustomizationComplete(validCustomizations);
      onOpenChange(false);
    }
  };

  const allCustomizationsSelected = customizations.every(c => c.selectedMaterialId && c.selectedOptionName);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl futuristic-card">
          <DialogHeader>
            <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Loading Customization
            </DialogTitle>
            <DialogDescription className="text-blue-300">
              Please wait while we load customization options for {itemName}.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8 text-blue-300">Loading customization options...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!bom || customizableComponents.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl futuristic-card">
          <DialogHeader>
            <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Customization
            </DialogTitle>
            <DialogDescription className="text-blue-300">
              Customization options for {itemName}
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8 text-blue-300">
            This product has no customizable options available.
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} className="cyber-button text-white font-semibold">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto futuristic-card" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Customize "{itemName}" (Qty: {quantity})
          </DialogTitle>
          <DialogDescription className="text-blue-300">
            Configure material options for customizable components in this product.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {customizableComponents.map((component, index) => {
            const customization = customizations.find(c => c.componentId === component.id);
            
            return (
              <Card key={component.id} className="neon-border bg-slate-800/30">
                <CardHeader>
                  <CardTitle className="text-blue-200 text-lg">
                    {component.component_name || `Component ${index + 1}`}
                  </CardTitle>
                  {component.notes && (
                    <p className="text-blue-300 text-sm">{component.notes}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-blue-200">
                      Choose {component.component_name} *
                    </Label>
                    <Select 
                      value={customization?.selectedMaterialId || ''} 
                      onValueChange={(materialId) => {
                        const option = component.bom_component_options.find(opt => opt.material_id === materialId);
                        if (option) {
                          updateCustomization(component.id, materialId, option.option_name);
                        }
                      }}
                    >
                    <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                      <SelectValue placeholder={`Choose ${component.component_name?.toLowerCase() || 'option'}`} />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-slate-800 border border-blue-500/30 shadow-lg backdrop-blur-sm">
                        {component.bom_component_options?.length > 0 ? (
                          component.bom_component_options.map((option) => {
                            const material = option.materials;
                            const available = material?.quantity_available || 0;
                            const needed = component.quantity_required * quantity;
                            
                            return (
                              <SelectItem 
                                key={option.id} 
                                value={option.material_id} 
                                className="text-blue-100 focus:bg-blue-800/30"
                              >
                                {option.option_name} ({available >= needed ? `In Stock: ${available}` : `Low Stock: ${available}`})
                              </SelectItem>
                            );
                          })
                        ) : (
                          <SelectItem value="no-options" disabled className="text-gray-400">
                            No customization options available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {customization?.selectedMaterialId && (
                    <div className="p-3 neon-border bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-md">
                      <div className="text-sm text-blue-200">
                        <div className="flex justify-between">
                          <span>Selected: {customization.selectedOptionName}</span>
                          <span>Quantity needed: {customization.quantityUsed} {
                            (() => {
                              const option = component.bom_component_options?.find(opt => opt.material_id === customization.selectedMaterialId);
                              return option?.materials?.unit || 'units';
                            })()
                          }</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {stockWarnings.length > 0 && (
            <Alert className="neon-border bg-orange-900/20 border-orange-500/30">
              <AlertDescription className="text-orange-300">
                <div className="font-semibold mb-2">Stock Warnings:</div>
                <ul className="list-disc list-inside space-y-1">
                  {stockWarnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleComplete}
              disabled={!allCustomizationsSelected}
              className="flex-1 cyber-button text-white font-semibold"
            >
              Complete Customization
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="neon-border bg-slate-800/50 text-blue-100"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}