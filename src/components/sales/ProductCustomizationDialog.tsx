import { useState, useEffect } from 'react';
import { Settings, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEnhancedBOMByItem } from '@/hooks/useEnhancedBOM';

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
  const { data: bom, isLoading } = useEnhancedBOMByItem(itemId);
  const [customizations, setCustomizations] = useState<ProductCustomization[]>([]);
  const [stockWarnings, setStockWarnings] = useState<string[]>([]);

  const customizableComponents = bom?.bom_components?.filter(comp => comp.is_customizable) || [];

  useEffect(() => {
    if (bom?.bom_components && bom.bom_components.length > 0) {
      const customizable = bom.bom_components.filter(comp => comp.is_customizable);
      if (customizable.length > 0) {
        setCustomizations(customizable.map(comp => {
          // Find the default option or use the first one
          const defaultOption = comp.bom_component_options?.find((opt: any) => opt.is_default) 
            || comp.bom_component_options?.[0];
          // Use option's quantity if set, otherwise use component's quantity
          const optionQty = defaultOption?.quantity_required ?? comp.quantity_required;
          
          return {
            componentId: comp.id,
            componentName: comp.component_name || 'Component',
            selectedMaterialId: '',
            selectedOptionName: '',
            quantityUsed: optionQty * quantity
          };
        }));
      }
    }
  }, [bom?.bom_components, quantity]);

  useEffect(() => {
    // Check stock availability for selected materials
    const warnings: string[] = [];
    const customizable = bom?.bom_components?.filter(comp => comp.is_customizable) || [];
    
    customizations.forEach(customization => {
      if (customization.selectedMaterialId) {
        // Find the material in the BOM component options
        let materialData = null;
        customizable.forEach(comp => {
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
  }, [customizations, bom?.bom_components]);

  const updateCustomization = (componentId: string, materialId: string, optionName: string, optionQuantity?: number) => {
    const component = customizableComponents.find(c => c.id === componentId);
    const option = component?.bom_component_options?.find(opt => opt.material_id === materialId);
    // Use option's quantity if available, otherwise fall back to component's quantity
    const qtyToUse = optionQuantity ?? (option as any)?.quantity_required ?? component?.quantity_required ?? 1;
    
    setCustomizations(prev => prev.map(custom => 
      custom.componentId === componentId 
        ? { ...custom, selectedMaterialId: materialId, selectedOptionName: optionName, quantityUsed: qtyToUse * quantity }
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
                           const optionQty = (option as any).quantity_required ?? component.quantity_required;
                           updateCustomization(component.id, materialId, option.option_name, optionQty);
                         }
                       }}
                     >
                       <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                         <SelectValue 
                           placeholder={`Choose ${component.component_name?.toLowerCase() || 'option'}`}
                         >
                           {customization?.selectedOptionName || `Choose ${component.component_name?.toLowerCase() || 'option'}`}
                         </SelectValue>
                       </SelectTrigger>
                      <SelectContent className="z-50 bg-slate-800 border border-blue-500/30 shadow-lg backdrop-blur-sm">
                        {component.bom_component_options?.length > 0 ? (
                          component.bom_component_options.map((option) => {
                            const material = option.materials;
                            // Use option's quantity_required if set, otherwise use component's
                            const optionQuantity = option.quantity_required ?? component.quantity_required;
                            const needed = optionQuantity * quantity;
                            const available = material?.quantity_available || 0;
                            const isAvailable = available >= needed;
                            const priceAdjustment = (option as any).price_adjustment || 0;
                            const materialCost = material ? (
                              (material as any).costing_method === 'exact' 
                                ? ((material as any).cost_price || (material as any).avg_cost || 0)
                                : ((material as any).avg_cost || (material as any).cost_price || 0)
                            ) : 0;
                            
                            return (
                              <SelectItem 
                                key={option.id} 
                                value={option.material_id} 
                                className={`text-blue-100 focus:bg-blue-800/30 ${!isAvailable ? 'text-orange-300' : ''}`}
                              >
                                <div className="flex justify-between items-center w-full gap-4">
                                  <span className="flex items-center gap-2">
                                    {option.option_name}
                                    {(option as any).is_default && (
                                      <span className="text-xs text-cyan-400">(Display)</span>
                                    )}
                                    <span className="text-xs text-blue-400">
                                      ₹{materialCost.toFixed(2)}/{material?.unit || 'unit'}
                                    </span>
                                    {priceAdjustment !== 0 && (
                                      <span className={`text-xs ${priceAdjustment > 0 ? 'text-orange-300' : 'text-green-300'}`}>
                                        {priceAdjustment > 0 ? '+' : ''}₹{priceAdjustment}
                                      </span>
                                    )}
                                  </span>
                                  <span className={`text-xs ml-2 ${isAvailable ? 'text-green-300' : 'text-orange-300'}`}>
                                    {isAvailable ? `✓ ${available} available` : `⚠ Low: ${available}/${needed}`}
                                  </span>
                                </div>
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

          {/* Cost Preview */}
          {allCustomizationsSelected && (
            <Card className="neon-border bg-gradient-to-r from-blue-400/5 to-cyan-400/5">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold text-cyan-300">Estimated Material Cost</h4>
                <div className="space-y-1">
                  {/* Fixed components cost */}
                  {(bom?.bom_components?.filter(c => !c.is_customizable && c.component_type === 'material') || []).map((comp, idx) => {
                    const mat = (comp as any).materials;
                    const unitCost = mat ? (
                      mat.costing_method === 'exact' ? (mat.cost_price || mat.avg_cost || 0) : (mat.avg_cost || mat.cost_price || 0)
                    ) : 0;
                    const totalCost = comp.quantity_required * quantity * unitCost;
                    return (
                      <div key={`fixed-${idx}`} className="flex justify-between text-sm">
                        <span className="text-blue-200">{mat?.name || comp.component_name || 'Material'} <span className="text-blue-400 text-xs">(fixed)</span></span>
                        <span className="text-blue-100">₹{totalCost.toFixed(2)}</span>
                      </div>
                    );
                  })}
                  {/* Customized components cost */}
                  {customizations.filter(c => c.selectedMaterialId).map((custom, idx) => {
                    let unitCost = 0;
                    customizableComponents.forEach(comp => {
                      const opt = comp.bom_component_options?.find(o => o.material_id === custom.selectedMaterialId);
                      if (opt?.materials) {
                        const m = opt.materials as any;
                        unitCost = m.costing_method === 'exact' ? (m.cost_price || m.avg_cost || 0) : (m.avg_cost || m.cost_price || 0);
                      }
                    });
                    const totalCost = custom.quantityUsed * unitCost;
                    return (
                      <div key={`custom-${idx}`} className="flex justify-between text-sm">
                        <span className="text-blue-200">{custom.selectedOptionName} <span className="text-cyan-400 text-xs">(customized)</span></span>
                        <span className="text-blue-100">₹{totalCost.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-blue-500/20 pt-2 flex justify-between font-semibold">
                  <span className="text-cyan-300">Total Estimated Cost</span>
                  <span className="text-cyan-200">₹{(() => {
                    const fixedCost = (bom?.bom_components?.filter(c => !c.is_customizable && c.component_type === 'material') || [])
                      .reduce((sum, comp) => {
                        const m = (comp as any).materials;
                        const uc = m ? (m.costing_method === 'exact' ? (m.cost_price || m.avg_cost || 0) : (m.avg_cost || m.cost_price || 0)) : 0;
                        return sum + comp.quantity_required * quantity * uc;
                      }, 0);
                    const customCost = customizations.filter(c => c.selectedMaterialId).reduce((sum, custom) => {
                      let unitCost = 0;
                      customizableComponents.forEach(comp => {
                        const opt = comp.bom_component_options?.find(o => o.material_id === custom.selectedMaterialId);
                        if (opt?.materials) {
                          const m = opt.materials as any;
                          unitCost = m.costing_method === 'exact' ? (m.cost_price || m.avg_cost || 0) : (m.avg_cost || m.cost_price || 0);
                        }
                      });
                      return sum + custom.quantityUsed * unitCost;
                    }, 0);
                    return (fixedCost + customCost).toFixed(2);
                  })()}</span>
                </div>
              </CardContent>
            </Card>
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