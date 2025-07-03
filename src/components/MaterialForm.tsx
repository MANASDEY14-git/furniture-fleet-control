import { useState } from 'react';
import { Package2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateMaterial, useUpdateMaterial, type Material } from '@/hooks/useMaterials';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';

interface MaterialFormProps {
  material?: Material;
  trigger: React.ReactNode;
}

const units = [
  'Units', 'Kg', 'Grams', 'Liters', 'Meters', 'Feet', 'Inches', 'Pieces', 'Boxes'
];

export default function MaterialForm({ material, trigger }: MaterialFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: material?.name || '',
    unit: material?.unit || '',
    quantity_available: material?.quantity_available || 0,
    cost_price: material?.cost_price || 0,
    store_id: material?.store_id || '',
    supplier_id: material?.supplier_id || '',
  });

  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.cost_price <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (material) {
        await updateMaterial.mutateAsync({
          id: material.id,
          ...formData
        });
      } else {
        await createMaterial.mutateAsync(formData);
      }
      
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving material:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      unit: '',
      quantity_available: 0,
      cost_price: 0,
      store_id: '',
      supplier_id: '',
    });
  };

  const isLoading = createMaterial.isPending || updateMaterial.isPending;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen && !material) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl futuristic-card" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Package2 className="w-5 h-5" />
            {material ? 'Edit Material' : 'Add New Material'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-blue-200">Material Name *</Label>
              <Input
                id="name"
                placeholder="Enter material name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit" className="text-blue-200">Unit of Measurement</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({...formData, unit: value})}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit} className="text-blue-100 focus:bg-blue-800/30">
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-blue-200">Initial Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                placeholder="Enter quantity"
                value={formData.quantity_available || ''}
                onChange={(e) => setFormData({...formData, quantity_available: parseFloat(e.target.value) || 0})}
                min="0"
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost" className="text-blue-200">Cost Price *</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                placeholder="Enter cost price"
                value={formData.cost_price || ''}
                onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})}
                required
                min="0"
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store" className="text-blue-200">Store</Label>
              <Select value={formData.store_id} onValueChange={(value) => setFormData({...formData, store_id: value})}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-blue-800/30">
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-blue-200">Supplier</Label>
              <Select value={formData.supplier_id} onValueChange={(value) => setFormData({...formData, supplier_id: value})}>
                <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-blue-500/30">
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id} className="text-blue-100 focus:bg-blue-800/30">
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1 cyber-button text-white font-semibold" 
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : (material ? 'Update Material' : 'Add Material')}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="neon-border bg-slate-800/50 text-blue-100"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}