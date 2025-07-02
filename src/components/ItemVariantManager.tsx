
import { useState } from 'react';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAttributes } from '@/hooks/useAttributes';
import { useItemVariants, useCreateItemVariant, useUpdateItemVariant, useDeleteItemVariant } from '@/hooks/useItemVariants';
import { formatCurrency } from '@/utils/currencyUtils';
import type { Item } from '@/hooks/useItems';

interface ItemVariantManagerProps {
  item: Item;
  trigger: React.ReactNode;
}

interface VariantFormData {
  sku: string;
  quantity_available: number;
  cost_price: number;
  selling_price: number;
  attribute_value_ids: string[];
}

export default function ItemVariantManager({ item, trigger }: ItemVariantManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<string | null>(null);
  const [formData, setFormData] = useState<VariantFormData>({
    sku: '',
    quantity_available: 0,
    cost_price: 0,
    selling_price: 0,
    attribute_value_ids: [],
  });

  const { data: attributes = [] } = useAttributes();
  const { data: variants = [] } = useItemVariants(item.id);
  const createVariant = useCreateItemVariant();
  const updateVariant = useUpdateItemVariant();
  const deleteVariant = useDeleteItemVariant();

  const resetForm = () => {
    setFormData({
      sku: '',
      quantity_available: 0,
      cost_price: 0,
      selling_price: 0,
      attribute_value_ids: [],
    });
    setEditingVariant(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingVariant) {
        await updateVariant.mutateAsync({
          id: editingVariant,
          item_id: item.id,
          ...formData,
        });
      } else {
        await createVariant.mutateAsync({
          item_id: item.id,
          ...formData,
        });
      }
      resetForm();
    } catch (error) {
      console.error('Error saving variant:', error);
    }
  };

  const handleEdit = (variant: any) => {
    setEditingVariant(variant.id);
    setFormData({
      sku: variant.sku || '',
      quantity_available: variant.quantity_available,
      cost_price: variant.cost_price,
      selling_price: variant.selling_price,
      attribute_value_ids: variant.item_variant_attributes.map((attr: any) => attr.attribute_value_id),
    });
  };

  const handleDelete = async (variantId: string) => {
    try {
      await deleteVariant.mutateAsync({ id: variantId, item_id: item.id });
    } catch (error) {
      console.error('Error deleting variant:', error);
    }
  };

  const handleAttributeValueToggle = (valueId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      attribute_value_ids: checked
        ? [...prev.attribute_value_ids, valueId]
        : prev.attribute_value_ids.filter(id => id !== valueId)
    }));
  };

  const getVariantDisplayName = (variant: any) => {
    const attributeValues = variant.item_variant_attributes.map((attr: any) => 
      attr.attribute_values.value
    );
    return attributeValues.length > 0 ? attributeValues.join(' / ') : 'No attributes';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-6xl futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Package className="w-5 h-5" />
            Manage Variants for "{item.name}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Variant Form */}
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300">
                {editingVariant ? 'Edit Variant' : 'Create New Variant'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-blue-200">SKU (Optional)</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="SKU code"
                      className="neon-border bg-slate-800/50 text-blue-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-blue-200">Quantity *</Label>
                    <Input
                      type="number"
                      value={formData.quantity_available}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity_available: parseInt(e.target.value) || 0 }))}
                      min="0"
                      required
                      className="neon-border bg-slate-800/50 text-blue-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-blue-200">Cost Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      required
                      className="neon-border bg-slate-800/50 text-blue-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-blue-200">Selling Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, selling_price: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      required
                      className="neon-border bg-slate-800/50 text-blue-100"
                    />
                  </div>
                </div>

                {/* Attribute Selection */}
                <div className="space-y-4">
                  <Label className="text-blue-200">Select Attributes</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attributes.map((attribute) => (
                      <Card key={attribute.id} className="futuristic-card">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-cyan-300">{attribute.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {attribute.attribute_values.map((value) => (
                            <div key={value.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`attr-${value.id}`}
                                checked={formData.attribute_value_ids.includes(value.id)}
                                onCheckedChange={(checked) => handleAttributeValueToggle(value.id, checked as boolean)}
                              />
                              <Label 
                                htmlFor={`attr-${value.id}`} 
                                className="text-blue-200 cursor-pointer"
                              >
                                {value.value}
                              </Label>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="cyber-button"
                    disabled={createVariant.isPending || updateVariant.isPending}
                  >
                    {createVariant.isPending || updateVariant.isPending 
                      ? 'Saving...' 
                      : editingVariant 
                      ? 'Update Variant' 
                      : 'Create Variant'
                    }
                  </Button>
                  {editingVariant && (
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={resetForm}
                      className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Variants Table */}
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300">Existing Variants</CardTitle>
            </CardHeader>
            <CardContent>
              {variants.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="data-grid">
                    <TableHeader>
                      <TableRow className="border-blue-500/30">
                        <TableHead className="text-blue-200">Attributes</TableHead>
                        <TableHead className="text-blue-200">SKU</TableHead>
                        <TableHead className="text-blue-200">Quantity</TableHead>
                        <TableHead className="text-blue-200">Cost Price</TableHead>
                        <TableHead className="text-blue-200">Selling Price</TableHead>
                        <TableHead className="text-right text-blue-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((variant) => (
                        <TableRow key={variant.id} className="border-blue-500/20 hover:bg-blue-800/20 transition-colors">
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {variant.item_variant_attributes.map((attr) => (
                                <Badge key={attr.id} variant="secondary" className="bg-blue-800/30 text-blue-200">
                                  {attr.attribute_values.value}
                                </Badge>
                              ))}
                              {variant.item_variant_attributes.length === 0 && (
                                <span className="text-gray-400 text-sm">No attributes</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-blue-200">{variant.sku || '—'}</TableCell>
                          <TableCell className="text-blue-200">{variant.quantity_available}</TableCell>
                          <TableCell className="text-blue-200">{formatCurrency(variant.cost_price)}</TableCell>
                          <TableCell className="text-blue-200">{formatCurrency(variant.selling_price)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(variant)}
                                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="futuristic-card">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-cyan-300">Delete Variant</AlertDialogTitle>
                                    <AlertDialogDescription className="text-blue-200">
                                      Are you sure you want to delete the variant "{getVariantDisplayName(variant)}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(variant.id)}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-blue-300">
                  No variants found. Create your first variant above.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
