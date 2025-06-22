
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateCategory, useUpdateCategory, Category } from '@/hooks/useCategories';

interface CategoryFormProps {
  category?: Category;
  trigger: React.ReactNode;
}

export default function CategoryForm({ category, trigger }: CategoryFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name || '');

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isEditing = !!category;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing) {
      updateCategory.mutate({ id: category.id, name });
    } else {
      createCategory.mutate({ name });
    }
    
    setOpen(false);
    if (!isEditing) {
      setName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            {isEditing ? 'Update Category' : 'Add Category'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
