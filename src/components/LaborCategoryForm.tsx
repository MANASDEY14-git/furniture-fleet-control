import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateLaborCategory, useUpdateLaborCategory, LaborCategory } from '@/hooks/useLaborCategories';

interface LaborCategoryFormProps {
  laborCategory?: LaborCategory;
  trigger: React.ReactNode;
}

export default function LaborCategoryForm({ laborCategory, trigger }: LaborCategoryFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(0);

  const createLaborCategory = useCreateLaborCategory();
  const updateLaborCategory = useUpdateLaborCategory();

  useEffect(() => {
    if (laborCategory) {
      setName(laborCategory.name);
      setDescription(laborCategory.description || '');
      setDefaultHourlyRate(laborCategory.default_hourly_rate);
    } else {
      setName('');
      setDescription('');
      setDefaultHourlyRate(0);
    }
  }, [laborCategory, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (laborCategory) {
      updateLaborCategory.mutate({
        id: laborCategory.id,
        name,
        description: description || undefined,
        default_hourly_rate: defaultHourlyRate
      }, {
        onSuccess: () => setOpen(false)
      });
    } else {
      createLaborCategory.mutate({
        name,
        description: description || undefined,
        default_hourly_rate: defaultHourlyRate
      }, {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setDescription('');
          setDefaultHourlyRate(0);
        }
      });
    }
  };

  const isLoading = createLaborCategory.isPending || updateLaborCategory.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300">
            {laborCategory ? 'Edit Labor Category' : 'Add Labor Category'}
          </DialogTitle>
          <DialogDescription className="text-blue-200">
            {laborCategory 
              ? 'Update the labor category details below.'
              : 'Create a new labor category with a default hourly rate.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-blue-200">Category Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Carpentry, Upholstery, Painting"
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description" className="text-blue-200">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of the labor type..."
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="defaultHourlyRate" className="text-blue-200">Default Hourly Rate (₹)</Label>
            <Input
              id="defaultHourlyRate"
              type="number"
              min="0"
              step="0.01"
              value={defaultHourlyRate}
              onChange={(e) => setDefaultHourlyRate(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              required
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This rate will be used as the default when adding this labor type to a BOM
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="cyber-button">
              {isLoading ? 'Saving...' : laborCategory ? 'Update Category' : 'Add Category'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
