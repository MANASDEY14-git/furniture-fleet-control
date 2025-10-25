import { useState } from 'react';
import { Plus, Pencil, Trash2, Package2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useItemVariants, useCreateItemVariant, useUpdateItemVariant, useDeleteItemVariant, type ItemVariant } from '@/hooks/useItemVariants';
import { formatCurrency } from '@/utils/currencyUtils';

interface ItemVariantManagerProps {
  itemId?: string;
  itemName?: string;
}

export default function ItemVariantManager({ itemId, itemName }: ItemVariantManagerProps) {
  const { data: variants = [], isLoading } = useItemVariants(itemId);
  const createVariant = useCreateItemVariant();
  const updateVariant = useUpdateItemVariant();
  const deleteVariant = useDeleteItemVariant();

  const [editingVariant, setEditingVariant] = useState<ItemVariant | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    variant_name: '',
    sku: '',
    quantity_available: 0,
    cost_price: 0,
    selling_price: 0,
  });

  if (!itemId) {
    return (
      <div className="text-center py-8">
        <Package2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Save the item first to add variants</p>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      variant_name: '',
      sku: '',
      quantity_available: 0,
      cost_price: 0,
      selling_price: 0,
    });
    setEditingVariant(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingVariant) {
        await updateVariant.mutateAsync({
          id: editingVariant.id,
          ...formData,
        });
      } else {
        await createVariant.mutateAsync({
          parent_item_id: itemId,
          ...formData,
        });
      }
      resetForm();
    } catch (error) {
      console.error('Error saving variant:', error);
    }
  };

  const handleEdit = (variant: ItemVariant) => {
    setEditingVariant(variant);
    setFormData({
      variant_name: variant.variant_name,
      sku: variant.sku || '',
      quantity_available: variant.quantity_available,
      cost_price: variant.cost_price,
      selling_price: variant.selling_price,
    });
    setShowForm(true);
  };

  const handleDelete = async (variantId: string) => {
    try {
      await deleteVariant.mutateAsync(variantId);
    } catch (error) {
      console.error('Error deleting variant:', error);
    }
  };

  const totalVariantQuantity = variants.reduce((sum, v) => sum + v.quantity_available, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Item Variants</h3>
          <p className="text-sm text-muted-foreground">
            Manage color, size, or other variations for {itemName}
          </p>
          {variants.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Total quantity across all variants: <span className="font-semibold">{totalVariantQuantity}</span>
            </p>
          )}
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Variant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVariant ? 'Edit Variant' : 'Add New Variant'}</DialogTitle>
              <DialogDescription>
                {editingVariant ? 'Update variant details' : 'Create a new variant for this item'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="variant_name">Variant Name *</Label>
                <Input
                  id="variant_name"
                  value={formData.variant_name}
                  onChange={(e) => setFormData({ ...formData, variant_name: e.target.value })}
                  placeholder="e.g., Red, Large, 500ml"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU (Optional)</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Unique product code"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity_available}
                    onChange={(e) => setFormData({ ...formData, quantity_available: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price *</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price *</Label>
                <Input
                  id="selling_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingVariant ? 'Update' : 'Create'} Variant
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {variants.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Package2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No variants added yet</p>
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Variant
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {variants.map((variant) => (
            <Card key={variant.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <span>{variant.variant_name}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(variant)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Variant</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{variant.variant_name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(variant.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardTitle>
                {variant.sku && (
                  <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Quantity</p>
                    <p className="font-semibold">{variant.quantity_available}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cost Price</p>
                    <p className="font-semibold">{formatCurrency(variant.cost_price)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Selling Price</p>
                    <p className="font-semibold text-lg">{formatCurrency(variant.selling_price)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}