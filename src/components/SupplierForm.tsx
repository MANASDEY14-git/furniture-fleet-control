
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateSupplier, useUpdateSupplier, type Supplier } from '@/hooks/useSuppliers';

interface SupplierFormProps {
  trigger: React.ReactNode;
  supplier?: Supplier;
  onSuccess?: () => void;
}

export default function SupplierForm({ trigger, supplier, onSuccess }: SupplierFormProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contact_person: supplier?.contact_person || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    gstin: supplier?.gstin || '',
  });

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const mutation = supplier 
      ? updateSupplier.mutate({ id: supplier.id, ...formData })
      : createSupplier.mutate(formData);

    if (!createSupplier.isPending && !updateSupplier.isPending) {
      setOpen(false);
      onSuccess?.();
      if (!supplier) {
        setFormData({
          name: '',
          contact_person: '',
          phone: '',
          email: '',
          address: '',
          gstin: '',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text">
            {supplier ? 'Update Supplier' : 'Add New Supplier'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-blue-200">Supplier Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                placeholder="Enter supplier name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contact_person" className="text-blue-200">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                placeholder="Contact person name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-blue-200">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                placeholder="Phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-blue-200">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                placeholder="Email address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gstin" className="text-blue-200">GSTIN</Label>
              <Input
                id="gstin"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
                placeholder="GST number"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address" className="text-blue-200">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
              placeholder="Complete address"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full cyber-button text-white font-semibold"
            disabled={createSupplier.isPending || updateSupplier.isPending}
          >
            {createSupplier.isPending || updateSupplier.isPending 
              ? (supplier ? 'Updating...' : 'Creating...') 
              : (supplier ? 'Update Supplier' : 'Create Supplier')
            }
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
