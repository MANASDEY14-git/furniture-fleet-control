
import { useState } from 'react';
import { Package, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useItems, useCreateItem, useUpdateItem, type Item } from '@/hooks/useItems';
import ItemBasicInfoForm from '@/components/ItemBasicInfoForm';
import ItemVariantsTab from '@/components/ItemVariantsTab';
import ItemAttributesTab from '@/components/ItemAttributesTab';
import BOMManager from '@/components/BOMManager';

interface ItemFormProps {
  item?: Item;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function ItemForm({ item, trigger, onSuccess }: ItemFormProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();

  const handleSubmit = async (formData: any) => {
    try {
      if (item) {
        await updateItem.mutateAsync({
          id: item.id,
          ...formData
        });
      } else {
        await createItem.mutateAsync(formData);
      }
      
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const isLoading = createItem.isPending || updateItem.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Package className="w-5 h-5" />
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
            <TabsTrigger value="basic" className="text-blue-200 data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="variants" className="text-blue-200 data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300" disabled={!item}>
              Variants
            </TabsTrigger>
            <TabsTrigger value="bom" className="text-blue-200 data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300" disabled={!item}>
              BOM
            </TabsTrigger>
            <TabsTrigger value="attributes" className="text-blue-200 data-[state=active]:bg-cyan-900/50 data-[state=active]:text-cyan-300">
              <Settings className="w-4 h-4 mr-1" />
              Attributes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-6">
            <ItemBasicInfoForm
              item={item}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="variants" className="mt-6">
            <ItemVariantsTab item={item} />
          </TabsContent>

          <TabsContent value="bom" className="mt-6">
            {item && <BOMManager item={item} />}
          </TabsContent>

          <TabsContent value="attributes" className="mt-6">
            <ItemAttributesTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
