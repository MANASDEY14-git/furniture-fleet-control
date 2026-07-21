import React, { useState } from 'react';
import { useCreateCustomer } from '@/hooks/useCustomers';
import { useStores } from '@/hooks/useStores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export function CustomerForm({ 
  onSuccess, 
  onCancel 
}: { 
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { data: stores, isLoading: storesLoading } = useStores();
  const createCustomer = useCreateCustomer();
  
  const [formData, setFormData] = useState({
    store_id: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.store_id) {
      alert("Please select a store");
      return;
    }
    
    await createCustomer.mutateAsync({
      store_id: formData.store_id,
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
      gst_number: formData.gst_number || null,
      notes: formData.notes || null
    });
    
    if (onSuccess) onSuccess();
  };

  if (storesLoading) return <Skeleton className="w-full h-96" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Store *</Label>
        <Select 
          value={formData.store_id} 
          onValueChange={(val) => setFormData({...formData, store_id: val})}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Store" />
          </SelectTrigger>
          <SelectContent>
            {stores?.map(store => (
              <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label>Customer Name *</Label>
        <Input 
          required 
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="e.g. John Doe"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input 
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            placeholder="+91..."
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input 
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="john@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Primary Address (Billing)</Label>
        <Textarea 
          value={formData.address}
          onChange={(e) => setFormData({...formData, address: e.target.value})}
          placeholder="Full address details"
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label>GST Number</Label>
        <Input 
          value={formData.gst_number}
          onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
          placeholder="GSTIN (optional)"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea 
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Any special requirements..."
          className="resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={createCustomer.isPending} className="cyber-button">
          Create Customer
        </Button>
      </div>
    </form>
  );
}
