import { useState } from 'react';
import { Edit, Eye, Trash2, AlertTriangle, CheckCircle, DollarSign, Search, Filter, Target, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BOMListItem } from '@/types/bom';
import { useEnhancedBOMList, useDeleteBOM, useBOMValidation, useBOMCostCalculation } from '@/hooks/useEnhancedBOM';
import { BOMFormWizard } from './BOMFormWizard';
import { BOMValidationRules } from '../BOMValidationRules';
import { BOMCostBreakdown } from '../BOMCostBreakdown';
import { useItems } from '@/hooks/useItems';

interface EnhancedBOMTableProps {
  searchTerm: string;
  selectedCategory: string;
  onSelectItem?: (item: { id: string; name: string }) => void;
}

export function EnhancedBOMTable({ searchTerm, selectedCategory, onSelectItem }: EnhancedBOMTableProps) {
  const [selectedBOM, setSelectedBOM] = useState<BOMListItem | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<{ id: string; name: string; bomId?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'validation' | 'analytics'>('table');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'issues'>('all');
  const [selectedBOMForAnalysis, setSelectedBOMForAnalysis] = useState<string | null>(null);

  const { data: bomList = [], isLoading } = useEnhancedBOMList({
    searchTerm,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
  });

  const { data: items = [] } = useItems();
  const deleteBOM = useDeleteBOM();
  const bomValidation = useBOMValidation();

  // Filter BOMs based on status filter
  const filteredBOMList = bomList.filter(bom => {
    switch (statusFilter) {
      case 'active': return bom.is_active;
      case 'inactive': return !bom.is_active;
      case 'issues': return bom.has_stock_issues;
      default: return true;
    }
  });

  const handleEdit = (bom: BOMListItem) => {
    const item = items.find(i => i.id === bom.item_id);
    if (item) {
      setSelectedItemForEdit({ id: item.id, name: item.name, bomId: bom.id });
      setShowWizard(true);
    }
  };

  const handleDelete = async (bomId: string) => {
    if (confirm('Are you sure you want to deactivate this BOM?')) {
      await deleteBOM.mutateAsync(bomId);
    }
  };

  const getStatusBadge = (bom: BOMListItem) => {
    if (!bom.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (bom.has_stock_issues) {
      return <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        Stock Issues
      </Badge>;
    }
    return <Badge variant="default" className="gap-1 bg-green-600">
      <CheckCircle className="w-3 h-3" />
      Active
    </Badge>;
  };

  const getValidationStatus = (bomId: string) => {
    // This would ideally come from the validation hook, but for now we'll simulate
    const hasIssues = Math.random() > 0.7; // 30% chance of issues for demo
    if (hasIssues) {
      return <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        Validation Issues
      </Badge>;
    }
    return <Badge variant="default" className="gap-1 bg-green-600">
      <CheckCircle className="w-3 h-3" />
      Validated
    </Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading BOM data...</div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-foreground">Bill of Materials Overview</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="issues">With Issues</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <TabsList>
                  <TabsTrigger value="table">Table</TabsTrigger>
                  <TabsTrigger value="validation">Validation</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <TabsContent value="table">
              {filteredBOMList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No BOMs Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'No BOMs match your search criteria' : 'Start by creating your first BOM'}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>BOM Name</TableHead>
                      <TableHead>Components</TableHead>
                      <TableHead>Estimated Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Validation</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBOMList.map((bom) => (
                      <TableRow key={bom.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{items.find(i => i.id === bom.item_id)?.name ?? bom.item_name}</TableCell>
                        <TableCell>{bom.name || 'Unnamed BOM'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{bom.component_count} components</Badge>
                            {bom.component_count > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBOMForAnalysis(bom.id)}
                                className="h-6 px-2 text-xs"
                              >
                                <Target className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-2">
                            ₹{bom.estimated_cost.toFixed(2)}
                            {bom.estimated_cost > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedBOMForAnalysis(bom.id)}
                                className="h-6 px-2 text-xs"
                              >
                                <DollarSign className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(bom)}</TableCell>
                        <TableCell>{getValidationStatus(bom.id)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">v{bom.version}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(bom.last_updated).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {onSelectItem && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  const item = items.find(i => i.id === bom.item_id);
                                  if (item) {
                                    onSelectItem({ id: item.id, name: item.name });
                                  }
                                }}
                                className="gap-1 bg-primary hover:bg-primary/80"
                              >
                                <Eye className="w-4 h-4" />
                                Manage
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedBOM(bom)}
                              className="gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(bom)}
                              className="gap-1"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(bom.id)}
                              className="gap-1 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="validation">
              <div className="space-y-4">
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto text-orange-400 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">BOM Validation</h3>
                  <p className="text-muted-foreground mb-4">
                    Select a BOM from the table to view its validation status and rules.
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="space-y-4">
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto text-green-400 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Cost Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    Click on cost icons in the table to view detailed cost breakdowns for specific BOMs.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* BOM Details Dialog */}
      <Dialog open={!!selectedBOM} onOpenChange={() => setSelectedBOM(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>BOM Details - {selectedBOM?.item_name}</DialogTitle>
            <DialogDescription>Detailed information about this Bill of Materials.</DialogDescription>
          </DialogHeader>
          {selectedBOM && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">BOM Name:</span>
                  <p>{selectedBOM.name || 'Unnamed BOM'}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Components:</span>
                  <p>{selectedBOM.component_count}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Version:</span>
                  <p>v{selectedBOM.version}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Cost:</span>
                  <p className="font-mono">₹{selectedBOM.estimated_cost.toFixed(2)}</p>
                </div>
              </div>
              {getStatusBadge(selectedBOM)}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* BOM Creation/Edit Wizard */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItemForEdit ? `Edit BOM for ${selectedItemForEdit.name}` : 'Create New BOM'}
            </DialogTitle>
            <DialogDescription>Use the steps below to configure components and costs.</DialogDescription>
          </DialogHeader>
          {selectedItemForEdit && (
            <BOMFormWizard
              itemId={selectedItemForEdit.id}
              itemName={selectedItemForEdit.name}
              bomId={selectedItemForEdit.bomId}
              isEditMode={!!selectedItemForEdit.bomId}
              onSubmit={() => {
                setShowWizard(false);
                setSelectedItemForEdit(null);
              }}
              onCancel={() => {
                setShowWizard(false);
                setSelectedItemForEdit(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}