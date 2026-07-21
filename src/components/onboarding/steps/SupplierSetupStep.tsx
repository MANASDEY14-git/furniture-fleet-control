import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, X, Phone, Mail, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SupplierSetupStepProps {
  onboardingData: any;
  setOnboardingData: (data: any) => void;
  onNext: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

interface Supplier {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
}

export default function SupplierSetupStep({ 
  onboardingData, 
  setOnboardingData, 
  onNext, 
  loading, 
  setLoading 
}: SupplierSetupStepProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { name: '', contactPerson: '', email: '', phone: '', address: '', gstin: '' }
  ]);
  const { toast } = useToast();

  const addSupplier = () => {
    setSuppliers([...suppliers, { name: '', contactPerson: '', email: '', phone: '', address: '', gstin: '' }]);
  };

  const removeSupplier = (index: number) => {
    if (suppliers.length > 1) {
      setSuppliers(suppliers.filter((_, i) => i !== index));
    }
  };

  const updateSupplier = (index: number, field: keyof Supplier, value: string) => {
    const updatedSuppliers = [...suppliers];
    updatedSuppliers[index][field] = value;
    setSuppliers(updatedSuppliers);
  };

  const handleSkip = () => {
    toast({
      title: "Supplier setup skipped",
      description: "You can add suppliers later from the Suppliers page.",
    });
    onNext();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validSuppliers = suppliers.filter(supplier => 
      supplier.name.trim() && supplier.contactPerson.trim()
    );

    if (validSuppliers.length === 0) {
      toast({
        title: "No valid suppliers to create",
        description: "Please fill in at least one supplier's basic info or skip this step.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const suppliersToInsert = validSuppliers.map(supplier => ({
        name: supplier.name.trim(),
        contact_person: supplier.contactPerson.trim(),
        email: supplier.email.trim() || null,
        phone: supplier.phone.trim() || null,
        address: supplier.address.trim() || null,
        gstin: supplier.gstin.trim() || null,
      }));

      const { data: createdSuppliers, error } = await supabase
        .from('suppliers')
        .insert(suppliersToInsert)
        .select();

      if (error) throw error;

      setOnboardingData({ 
        ...onboardingData, 
        supplierIds: createdSuppliers.map(supplier => supplier.id) 
      });

      toast({
        title: "Suppliers added successfully!",
        description: `Created ${createdSuppliers.length} supplier${createdSuppliers.length > 1 ? 's' : ''}.`,
      });
      onNext();
    } catch (error: any) {
      console.error('Error creating suppliers:', error);
      toast({
        title: "Error creating suppliers",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Add Your Key Suppliers</h2>
        <p className="text-muted-foreground">
          Set up your main suppliers to track purchases and manage relationships.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Information</CardTitle>
          <CardDescription>
            Add your most important suppliers. You can add more anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {suppliers.map((supplier, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <Badge variant="outline">Supplier {index + 1}</Badge>
                  {suppliers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSupplier(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      placeholder="e.g., Furniture Wholesale Co."
                      value={supplier.name}
                      onChange={(e) => updateSupplier(index, 'name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Person *</Label>
                    <Input
                      placeholder="e.g., John Smith"
                      value={supplier.contactPerson}
                      onChange={(e) => updateSupplier(index, 'contactPerson', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="contact@supplier.com"
                      value={supplier.email}
                      onChange={(e) => updateSupplier(index, 'email', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </Label>
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={supplier.phone}
                      onChange={(e) => updateSupplier(index, 'phone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Address
                    </Label>
                    <Input
                      placeholder="123 Business Ave, City, State, ZIP"
                      value={supplier.address}
                      onChange={(e) => updateSupplier(index, 'address', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>GSTIN (Tax ID)</Label>
                    <Input
                      placeholder="e.g., 22AAAAA0000A1Z5"
                      value={supplier.gstin}
                      onChange={(e) => updateSupplier(index, 'gstin', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addSupplier}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Supplier
            </Button>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="ghost" onClick={handleSkip}>
                Skip for Now
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding Suppliers...' : 'Add Suppliers & Continue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="bg-accent/10 rounded-lg p-4">
        <h3 className="font-medium mb-2">📋 Note</h3>
        <p className="text-sm text-muted-foreground">
          Only company name and contact person are required. You can always update 
          supplier details later from the Suppliers page.
        </p>
      </div>
    </div>
  );
}