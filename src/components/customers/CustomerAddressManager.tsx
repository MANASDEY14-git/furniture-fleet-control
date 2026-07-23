import React, { useState } from 'react';
import { 
  useCustomerAddresses, 
  useCreateCustomerAddress, 
  useUpdateCustomerAddress, 
  useDeleteCustomerAddress,
  CustomerAddress
} from '@/hooks/useCustomerAddresses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Plus, Trash2, Edit2, Star, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

export function CustomerAddressManager({ customerId }: { customerId: string }) {
  const { data: addresses, isLoading } = useCustomerAddresses(customerId);
  const createAddress = useCreateCustomerAddress();
  const updateAddress = useUpdateCustomerAddress();
  const deleteAddress = useDeleteCustomerAddress();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    label: '',
    address: '',
    contact_person: '',
    phone: '',
    is_default: false,
  });

  const resetForm = () => {
    setFormData({ label: '', address: '', contact_person: '', phone: '', is_default: false });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (address: CustomerAddress) => {
    setFormData({
      label: address.label ?? '',
      address: address.address,
      contact_person: address.contact_person ?? '',
      phone: address.phone ?? '',
      is_default: address.is_default,
    });
    setEditingId(address.id);
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateAddress.mutateAsync({ id: editingId, customer_id: customerId, ...formData });
    } else {
      await createAddress.mutateAsync({ customer_id: customerId, ...formData });
    }
    resetForm();
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Saved Addresses</h3>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm" variant="outline" className="text-cyan-400 border-cyan-400/30 hover:bg-cyan-900/20">
            <Plus className="w-4 h-4 mr-2" /> Add Address
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="border-cyan-500/30 bg-background/50 backdrop-blur">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Home, Office, Warehouse..."
                />
              </div>
              <div className="space-y-2">
                <Label>Address *</Label>
                <Textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(c) => setFormData({ ...formData, is_default: !!c })}
                />
                <Label htmlFor="is_default">Set as default address</Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={createAddress.isPending || updateAddress.isPending}>
                  {editingId ? 'Update Address' : 'Save Address'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!isAdding && addresses?.length === 0 && (
        <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No addresses saved yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses?.map((address) => (
          <Card key={address.id} className={`relative overflow-hidden ${address.is_default ? 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'border-border/50'}`}>
            {address.is_default && (
              <div className="absolute top-0 right-0 bg-cyan-500/20 text-cyan-400 text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg flex items-center">
                <Star className="w-3 h-3 mr-1 fill-cyan-400" /> Default
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-1 shrink-0" />
                <div className="flex-1 min-w-0">
                  {address.label && <p className="font-medium text-foreground truncate">{address.label}</p>}
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{address.address}</p>
                  {(address.contact_person || address.phone) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {address.contact_person}{address.contact_person && address.phone ? ' · ' : ''}{address.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border/30">
                {!address.is_default && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs mr-auto text-muted-foreground hover:text-cyan-400"
                    onClick={() => updateAddress.mutate({ id: address.id, customer_id: customerId, is_default: true })}
                    disabled={updateAddress.isPending}
                  >
                    <Check className="w-3 h-3 mr-1" /> Set Default
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20" onClick={() => handleEdit(address)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this address?')) {
                      deleteAddress.mutate({ id: address.id, customerId });
                    }
                  }}
                  disabled={deleteAddress.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
