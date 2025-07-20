import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InventorySetupStepProps {
  onboardingData: any;
  setOnboardingData: (data: any) => void;
  onNext: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

interface InventoryItem {
  name: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  quantity: string;
}

const FURNITURE_CATEGORIES = [
  'Sofas & Seating',
  'Tables',
  'Chairs',
  'Beds & Mattresses',
  'Storage & Wardrobes',
  'Dining Sets',
  'Office Furniture',
  'Outdoor Furniture',
  'Home Decor',
  'Other'
];

export default function InventorySetupStep({ 
  onboardingData, 
  setOnboardingData, 
  onNext, 
  loading, 
  setLoading 
}: InventorySetupStepProps) {
  const [items, setItems] = useState<InventoryItem[]>([
    { name: '', category: '', costPrice: '', sellingPrice: '', quantity: '0' }
  ]);
  const { toast } = useToast();

  const addItem = () => {
    setItems([...items, { name: '', category: '', costPrice: '', sellingPrice: '', quantity: '0' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InventoryItem, value: string) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };

  const handleSkip = () => {
    toast({
      title: "Inventory setup skipped",
      description: "You can add items later from the Inventory page.",
    });
    onNext();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => 
      item.name.trim() && 
      item.category && 
      item.costPrice && 
      item.sellingPrice
    );

    if (validItems.length === 0) {
      toast({
        title: "No valid items to create",
        description: "Please fill in at least one complete item or skip this step.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First create categories if they don't exist
      const uniqueCategories = [...new Set(validItems.map(item => item.category))];
      const categoryPromises = uniqueCategories.map(async (categoryName) => {
        const { data: existingCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('name', categoryName)
          .single();

        if (existingCategory) {
          return existingCategory;
        }

        const { data: newCategory, error } = await supabase
          .from('categories')
          .insert([{ name: categoryName }])
          .select()
          .single();

        if (error) throw error;
        return newCategory;
      });

      const categories = await Promise.all(categoryPromises);
      const categoryMap: Record<string, string> = {};
      categories.forEach((cat, index) => {
        categoryMap[uniqueCategories[index]] = cat.id;
      });

      // Then create items
      const itemsToInsert = validItems.map(item => ({
        name: item.name.trim(),
        category_id: categoryMap[item.category],
        store_id: onboardingData.storeId,
        cost_price: parseFloat(item.costPrice),
        selling_price: parseFloat(item.sellingPrice),
        quantity_available: parseInt(item.quantity) || 0,
      }));

      const { data: createdItems, error } = await supabase
        .from('items')
        .insert(itemsToInsert)
        .select();

      if (error) throw error;

      setOnboardingData({ 
        ...onboardingData, 
        itemIds: createdItems.map(item => item.id) 
      });

      toast({
        title: "Inventory items created!",
        description: `Successfully added ${createdItems.length} items to your inventory.`,
      });
      onNext();
    } catch (error: any) {
      console.error('Error creating inventory items:', error);
      toast({
        title: "Error creating inventory",
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
          <Package className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Add Your Initial Inventory</h2>
        <p className="text-muted-foreground">
          Start with a few key items. You can always add more later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            Add your most important furniture items to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {items.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <Badge variant="outline">Item {index + 1}</Badge>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Input
                      placeholder="e.g., Modern 3-Seat Sofa"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select 
                      value={item.category} 
                      onValueChange={(value) => updateItem(index, 'category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {FURNITURE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cost Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.costPrice}
                      onChange={(e) => updateItem(index, 'costPrice', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Selling Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={item.sellingPrice}
                      onChange={(e) => updateItem(index, 'sellingPrice', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Initial Quantity</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Item
            </Button>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="ghost" onClick={handleSkip}>
                Skip for Now
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding Items...' : 'Add Items & Continue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="bg-accent/10 rounded-lg p-4">
        <h3 className="font-medium mb-2">💡 Quick Start Tip</h3>
        <p className="text-sm text-muted-foreground">
          Focus on your best-selling items first. You can bulk import your complete 
          inventory later using CSV files from the Inventory page.
        </p>
      </div>
    </div>
  );
}