import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StoreSetupStepProps {
  onboardingData: any;
  setOnboardingData: (data: any) => void;
  onNext: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export default function StoreSetupStep({ 
  onboardingData, 
  setOnboardingData, 
  onNext, 
  loading, 
  setLoading 
}: StoreSetupStepProps) {
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.location.trim()) {
      toast({
        title: "Please fill in required fields",
        description: "Store name and location are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: store, error } = await supabase
        .from('stores')
        .insert([{
          name: formData.name.trim(),
          location: formData.location.trim(),
        }])
        .select()
        .single();

      if (error) throw error;

      setOnboardingData({ ...onboardingData, storeId: store.id });
      toast({
        title: "Store created successfully!",
        description: `${formData.name} has been set up.`,
      });
      onNext();
    } catch (error: any) {
      console.error('Error creating store:', error);
      toast({
        title: "Error creating store",
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
          <Store className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Set Up Your First Store</h2>
        <p className="text-muted-foreground">
          Create your primary store location. You can add more stores later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Store Information
          </CardTitle>
          <CardDescription>
            Enter the basic details for your store location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                placeholder="e.g., Downtown Furniture Store"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeLocation">Location *</Label>
              <Input
                id="storeLocation"
                placeholder="e.g., 123 Main St, City, State"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storeDescription">Description (Optional)</Label>
              <Textarea
                id="storeDescription"
                placeholder="Brief description of your store..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating Store...' : 'Create Store & Continue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="bg-accent/10 rounded-lg p-4">
        <h3 className="font-medium mb-2">💡 Pro Tip</h3>
        <p className="text-sm text-muted-foreground">
          If you have multiple locations, start with your main store. You can easily add 
          additional stores from the Settings page once your setup is complete.
        </p>
      </div>
    </div>
  );
}