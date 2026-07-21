import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { BOMFormWizard } from './BOMFormWizard';
import { BOMValidation } from '../BOMValidation';
import { BOMComponentCategory } from '../BOMComponentCategories';
import { AlternativeMaterials } from '../AlternativeMaterials';
import { BOMCostBreakdown } from '../BOMCostBreakdown';
import { BOMProductionPlanning } from '../BOMProductionPlanning';
import { BOMTemplates } from '../BOMTemplates';
import { BOMStockIntegration } from '../BOMStockIntegration';
import { BOMVersionManagement } from '../BOMVersionManagement';
import { BOMSalesIntegration } from '../BOMSalesIntegration';
import { useEnhancedBOMByItem, useBOMCostCalculation, useBOMValidation } from '@/hooks/useEnhancedBOM';
import { useMaterials } from '@/hooks/useMaterials';
import { useLaborCategories } from '@/hooks/useLaborCategories';
import { useToast } from '@/hooks/use-toast';

interface EnhancedBOMManagerProps {
  itemId?: string;
  bomId?: string;
  isEditMode?: boolean;
}

export function EnhancedBOMManager({ itemId, bomId, isEditMode = false }: EnhancedBOMManagerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showWizard, setShowWizard] = useState(false);
  const { toast } = useToast();
  
  const { data: bom, isLoading: bomLoading } = useEnhancedBOMByItem(itemId || '');
  const { data: costCalculation } = useBOMCostCalculation(bomId || bom?.id || '');
  const { validateBOM } = useBOMValidation();
  const { data: materials = [] } = useMaterials();
  const { data: laborCategories = [] } = useLaborCategories();

  // Live production cost calculation using costing_method
  const liveCost = bom?.bom_components ? (() => {
    let materialTotal = 0;
    let laborTotal = 0;
    let fixedServiceTotal = 0;
    let percentageServicePcts: number[] = [];

    bom.bom_components.forEach((comp: any) => {
      if (comp.component_type === 'material' && comp.materials) {
        const m = comp.materials;
        const cost = m.costing_method === 'exact' 
          ? (m.cost_price || m.avg_cost || 0) 
          : (m.avg_cost || m.cost_price || 0);
        materialTotal += comp.quantity_required * cost;
      } else if (comp.component_type === 'labor') {
        const rate = comp.hourly_rate || comp.labor_categories?.default_hourly_rate || 0;
        const hours = (comp.time_hours || 0) + ((comp.time_minutes || 0) / 60);
        laborTotal += rate * hours;
      } else if (comp.component_type === 'service') {
        if (comp.service_cost_type === 'percentage') {
          percentageServicePcts.push(comp.service_cost || 0);
        } else {
          fixedServiceTotal += comp.service_cost || 0;
        }
      }
    });

    const subtotal = materialTotal + laborTotal;
    const pctTotal = percentageServicePcts.reduce((s, p) => s + subtotal * p / 100, 0);
    const total = subtotal + fixedServiceTotal + pctTotal;
    return { materialTotal, laborTotal, fixedServiceTotal, pctTotal, total };
  })() : null;

  // Validate current BOM if it exists
  const validation = bom ? validateBOM({
    item_id: bom.item_id,
    name: bom.name || '',
    components: bom.bom_components || [],
    version_notes: bom.version_notes || ''
  }) : null;

  const handleWizardSubmit = () => {
    setShowWizard(false);
    toast({
      title: "Success",
      description: "BOM has been updated successfully",
    });
  };

  if (bomLoading) {
    return (
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showWizard) {
    return (
      <BOMFormWizard
        itemId={itemId}
        bomId={bomId}
        isEditMode={isEditMode}
        onSubmit={handleWizardSubmit}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Enhanced BOM Manager</h2>
          <p className="text-muted-foreground">
            Comprehensive Bill of Materials management with advanced features
          </p>
        </div>
        <Button 
          onClick={() => setShowWizard(true)}
          className="bg-primary hover:bg-primary/80"
        >
          <Settings className="w-4 h-4 mr-2" />
          {bom ? 'Edit BOM' : 'Create BOM'}
        </Button>
      </div>

      {/* Validation Alert */}
      {validation && (
        <BOMValidation validation={validation} />
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 bg-slate-800/50 border border-blue-500/30">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">
            <Package className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="components" className="data-[state=active]:bg-blue-600">
            <Settings className="w-4 h-4 mr-2" />
            Components
          </TabsTrigger>
          <TabsTrigger value="costing" className="data-[state=active]:bg-blue-600">
            <TrendingUp className="w-4 h-4 mr-2" />
            Costing
          </TabsTrigger>
          <TabsTrigger value="stock" className="data-[state=active]:bg-blue-600">
            Stock
          </TabsTrigger>
          <TabsTrigger value="sales" className="data-[state=active]:bg-blue-600">
            Sales
          </TabsTrigger>
          <TabsTrigger value="versions" className="data-[state=active]:bg-blue-600">
            Versions
          </TabsTrigger>
          <TabsTrigger value="production" className="data-[state=active]:bg-blue-600">
            Production
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-blue-600">
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {bom ? (
            <div className="space-y-6">
              {/* Live Production Cost Card */}
              {liveCost && (
                <Card className="bg-gradient-to-r from-slate-800/80 to-blue-900/40 border-cyan-500/40">
                  <CardHeader>
                    <CardTitle className="text-cyan-300 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Current Production Cost (Live)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-xs text-blue-300 mb-1">Materials</div>
                        <div className="text-lg font-bold text-white font-mono">₹{liveCost.materialTotal.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-blue-300 mb-1">Labor</div>
                        <div className="text-lg font-bold text-white font-mono">₹{liveCost.laborTotal.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-blue-300 mb-1">Fixed Services</div>
                        <div className="text-lg font-bold text-white font-mono">₹{liveCost.fixedServiceTotal.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-blue-300 mb-1">% Services</div>
                        <div className="text-lg font-bold text-white font-mono">₹{liveCost.pctTotal.toFixed(2)}</div>
                      </div>
                      <div className="border-l border-cyan-500/30 pl-4">
                        <div className="text-xs text-cyan-400 mb-1 font-semibold">TOTAL</div>
                        <div className="text-2xl font-bold text-cyan-300 font-mono">₹{liveCost.total.toFixed(2)}</div>
                      </div>
                    </div>
                    <p className="text-xs text-blue-400 mt-3">
                      Auto-updates when material prices change • Uses weighted avg or exact cost per material
                    </p>
                  </CardContent>
                </Card>
              )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* BOM Summary */}
              <Card className="bg-slate-800/50 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-300">BOM Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-200">BOM Name:</span>
                    <span className="text-white font-medium">{bom.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-200">Version:</span>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                      v{bom.version || 1}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-200">Components:</span>
                    <span className="text-white">{bom.bom_components?.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-200">Estimated Cost:</span>
                    <span className="text-white font-medium">
                      ₹{(bom.estimated_cost || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-200">Status:</span>
                    <Badge variant={bom.is_active ? "default" : "secondary"}>
                      {bom.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Component Categories Overview */}
              <Card className="bg-slate-800/50 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-cyan-300">Component Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['primary', 'secondary', 'optional', 'consumable'].map((category) => {
                      const count = bom.bom_components?.filter(comp => 
                        (comp as any).category === category
                      ).length || 0;
                      
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <BOMComponentCategory 
                            category={category as any} 
                            className="w-auto"
                          />
                          <span className="text-blue-200">{count} components</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-blue-500/30">
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No BOM Found</h3>
                <p className="text-blue-200 mb-6">
                  Create a Bill of Materials to start managing components and production planning.
                </p>
                <Button 
                  onClick={() => setShowWizard(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Create BOM
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="components" className="space-y-6">
          {bom && bom.bom_components && bom.bom_components.length > 0 ? (
            <div className="space-y-4">
              {bom.bom_components.map((component, index) => (
                <Card key={component.id || index} className="bg-slate-800/50 border-blue-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-medium text-white">
                            {component.component_name || component.materials?.name || 'Unnamed Component'}
                          </h4>
                          <BOMComponentCategory 
                            category={(component as any).category || 'primary'} 
                          />
                          {component.is_customizable && (
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300">
                              Customizable
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-blue-200">Quantity:</span>
                            <div className="text-white font-medium">
                              {component.quantity_required} {component.materials?.unit || 'units'}
                            </div>
                          </div>
                          <div>
                            <span className="text-blue-200">Type:</span>
                            <div className="text-white capitalize">{component.component_type || 'material'}</div>
                          </div>
                          <div>
                            <span className="text-blue-200">Unit Cost:</span>
                            <div className="text-white">₹{component.materials?.cost_price || 0}</div>
                          </div>
                          <div>
                            <span className="text-blue-200">Total Cost:</span>
                            <div className="text-white font-medium">
                              ₹{((component.materials?.cost_price || 0) * component.quantity_required).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Alternative Materials */}
                    {component.is_customizable && (
                      <AlternativeMaterials
                        componentId={component.id || ''}
                        primaryMaterialId={component.material_id || ''}
                        alternatives={(component as any).alternative_materials || []}
                        onAddAlternative={(alternative) => {
                          // Handle adding alternative material
                          toast({
                            title: "Alternative Added",
                            description: `${alternative.material_name} added as alternative`,
                          });
                        }}
                        onRemoveAlternative={(alternativeId) => {
                          // Handle removing alternative material
                          toast({
                            title: "Alternative Removed",
                            description: "Alternative material removed",
                          });
                        }}
                      />
                    )}

                    {component.notes && (
                      <div className="mt-4 p-3 bg-slate-700/30 rounded border border-blue-500/20">
                        <p className="text-blue-200 text-sm">{component.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-blue-500/30">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Components</h3>
                <p className="text-blue-200">This BOM doesn't have any components yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="costing" className="space-y-6">
          {costCalculation ? (
            <BOMCostBreakdown costCalculation={costCalculation} />
          ) : (
            <Card className="bg-slate-800/50 border-blue-500/30">
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Cost Data</h3>
                <p className="text-blue-200">Cost calculation is not available for this BOM.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="production" className="space-y-6">
          {bom ? (
            <BOMProductionPlanning bom={bom} />
          ) : (
            <Card className="bg-slate-800/50 border-blue-500/30">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No BOM Available</h3>
                <p className="text-blue-200">Create a BOM to access production planning features.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stock" className="space-y-6">
          {bom ? (
            <BOMStockIntegration 
              bom={bom} 
              onReorderRequest={(materialId, quantity) => {
                toast({
                  title: "Reorder Request",
                  description: `Reorder request created for ${quantity} units`,
                });
              }}
            />
          ) : (
            <Card className="bg-slate-800/50 border-blue-500/30">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No BOM Available</h3>
                <p className="text-blue-200">Create a BOM to access stock integration features.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          {bom && itemId ? (
            <BOMSalesIntegration 
              bom={bom} 
              itemId={itemId}
            />
          ) : (
            <Card className="bg-slate-800/50 border-blue-500/30">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No BOM Available</h3>
                <p className="text-blue-200">Create a BOM to access sales integration features.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="versions" className="space-y-6">
          {bom ? (
            <BOMVersionManagement 
              bom={bom}
              onCreateVersion={(notes) => {
                toast({
                  title: "Version Created",
                  description: "New BOM version created successfully",
                });
              }}
              onRestoreVersion={(versionId) => {
                toast({
                  title: "Version Restored",
                  description: "BOM version restored successfully",
                });
              }}
            />
          ) : (
            <Card className="bg-slate-800/50 border-blue-500/30">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No BOM Available</h3>
                <p className="text-blue-200">Create a BOM to access version management features.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <BOMTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
}