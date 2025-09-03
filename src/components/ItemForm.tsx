
import { useState } from 'react';
import { Package, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useItems, useCreateItem, useUpdateItem, type Item } from '@/hooks/useItems';
import { useIsMobile } from '@/hooks/use-mobile';
import ItemBasicInfoForm from '@/components/ItemBasicInfoForm';
import ItemAttributesTab from '@/components/ItemAttributesTab';

interface ItemFormProps {
  item?: Item;
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export default function ItemForm({ item, trigger, onSuccess }: ItemFormProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const isMobile = useIsMobile();

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
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[95vh] m-2' : 'max-w-4xl max-h-[90vh]'} simple-card`}>
        <DialogHeader className={isMobile ? 'pb-4' : ''}>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Package className="w-5 h-5" />
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
          <DialogDescription>
            {item ? 'Update item details and manage variants.' : 'Create a new item with basic information and variants.'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className={`${isMobile ? 'max-h-[calc(95vh-120px)]' : 'max-h-[calc(90vh-120px)]'} overflow-y-auto`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className={`w-full ${isMobile ? '' : 'pr-4'}`}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic" className="text-sm">
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="attributes" className="text-sm">
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

            <TabsContent value="attributes" className="mt-6">
              <ItemAttributesTab />
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
