import { useState } from 'react';
import { Edit, Eye, Trash2, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BOMListItem } from '@/types/bom';
import { useEnhancedBOMList, useDeleteBOM } from '@/hooks/useEnhancedBOM';
import { BOMFormWizard } from './BOMFormWizard';
import { useItems } from '@/hooks/useItems';

interface EnhancedBOMTableProps {
  searchTerm: string;
  selectedCategory: string;
}

export function EnhancedBOMTable({ searchTerm, selectedCategory }: EnhancedBOMTableProps) {
  const [selectedBOM, setSelectedBOM] = useState<BOMListItem | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<{ id: string; name: string } | null>(null);

  const { data: bomList = [], isLoading } = useEnhancedBOMList({
    searchTerm,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
  });

  const { data: items = [] } = useItems();
  const deleteBOM = useDeleteBOM();

  const handleEdit = (bom: BOMListItem) => {
    const item = items.find(i => i.id === bom.item_id);
    if (item) {
      setSelectedItemForEdit({ id: item.id, name: item.name });
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
          <CardTitle className="text-xl text-foreground">Bill of Materials Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {bomList.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-muted-foreground" />
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
                  <TableHead>Version</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bomList.map((bom) => (
                  <TableRow key={bom.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{bom.item_name}</TableCell>
                    <TableCell>{bom.name || 'Unnamed BOM'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{bom.component_count} components</Badge>
                    </TableCell>
                    <TableCell className="font-mono">₹{bom.estimated_cost.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(bom)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">v{bom.version}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(bom.last_updated).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
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
        </CardContent>
      </Card>

      {/* BOM Details Dialog */}
      <Dialog open={!!selectedBOM} onOpenChange={() => setSelectedBOM(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>BOM Details - {selectedBOM?.item_name}</DialogTitle>
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
          </DialogHeader>
          {selectedItemForEdit && (
            <BOMFormWizard
              itemId={selectedItemForEdit.id}
              itemName={selectedItemForEdit.name}
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