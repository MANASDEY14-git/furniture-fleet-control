
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateStore, useUpdateStore, Store } from '@/hooks/useStores';

interface StoreFormProps {
  store?: Store;
  trigger: React.ReactNode;
}

export default function StoreForm({ store, trigger }: StoreFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(store?.name || '');
  const [location, setLocation] = useState(store?.location || '');

  const createStore = useCreateStore();
  const updateStore = useUpdateStore();

  const isEditing = !!store;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing) {
      updateStore.mutate({ id: store.id, name, location });
    } else {
      createStore.mutate({ name, location });
    }
    
    setOpen(false);
    if (!isEditing) {
      setName('');
      setLocation('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Store' : 'Add New Store'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the store information below.' : 'Add a new store to your inventory system.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Store Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter store name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter store location"
              required
            />
          </div>
          <Button type="submit" className="w-full">
            {isEditing ? 'Update Store' : 'Add Store'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
