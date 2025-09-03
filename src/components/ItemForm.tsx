
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
      <DialogContent className={`${isMobile ? 'fixed inset-0 m-0 max-w-full max-h-full rounded-none border-0' : 'max-w-4xl max-h-[90vh]'} simple-card`}>
        <DialogHeader className={isMobile ? 'sticky top-0 z-10 bg-background border-b pb-4 px-6 pt-6' : ''}>
          <DialogTitle className={`flex items-center gap-2 font-semibold ${isMobile ? 'text-xl' : 'text-lg'}`}>
            <Package className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
          <DialogDescription className={isMobile ? 'text-base' : ''}>
            {item ? 'Update item details and manage variants.' : 'Create a new item with basic information and variants.'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className={`${isMobile ? 'flex-1 overflow-y-auto' : 'max-h-[calc(90vh-120px)] overflow-y-auto'}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className={`w-full ${isMobile ? 'px-6 pb-6' : 'pr-4'}`}>
            <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'h-12 text-base' : ''}`}>
              <TabsTrigger value="basic" className={`${isMobile ? 'text-base py-3' : 'text-sm'}`}>
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="attributes" className={`${isMobile ? 'text-base py-3' : 'text-sm'}`}>
                <Settings className={`${isMobile ? 'w-5 h-5 mr-2' : 'w-4 h-4 mr-1'}`} />
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
