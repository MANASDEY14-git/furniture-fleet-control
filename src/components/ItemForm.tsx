
import { useState } from 'react';
import { Package, Layers, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useItems, useCreateItem, useUpdateItem, type Item } from '@/hooks/useItems';
import { useIsMobile } from '@/hooks/use-mobile';
import ItemBasicInfoForm from '@/components/ItemBasicInfoForm';
import ItemComponentDetailsTab from '@/components/ItemComponentDetailsTab';

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

  if (isMobile) {
    // Mobile Sheet Layout
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[95vh] p-0 rounded-t-lg">
          <div className="flex flex-col h-full">
            {/* Mobile Header */}
            <SheetHeader className="px-6 py-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-primary" />
                  <div>
                    <SheetTitle className="text-xl font-semibold">
                      {item ? 'Edit Item' : 'Add New Item'}
                    </SheetTitle>
                    <SheetDescription className="text-base mt-1">
                      {item ? 'Update item details and manage variants.' : 'Create a new item with basic information and variants.'}
                    </SheetDescription>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </SheetHeader>

            {/* Mobile Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mx-6 mt-4 h-12">
                  <TabsTrigger value="basic" className="text-base py-3 font-medium">
                    Basic Info
                  </TabsTrigger>
                  <TabsTrigger value="components" className="text-base py-3 font-medium">
                    <Layers className="w-5 h-5 mr-2" />
                    Components
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 px-6 pb-6">
                  <TabsContent value="basic" className="mt-6">
                    <ItemBasicInfoForm
                      item={item}
                      onSubmit={handleSubmit}
                      onCancel={handleCancel}
                      isLoading={isLoading}
                    />
                  </TabsContent>

                  <TabsContent value="components" className="mt-6">
                    <ItemComponentDetailsTab itemId={item?.id} />
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Dialog Layout
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] simple-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold text-lg">
            <Package className="w-5 h-5" />
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
          <DialogDescription>
            {item ? 'Update item details and manage variants.' : 'Create a new item with basic information and variants.'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] overflow-y-auto pr-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic" className="text-sm">
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="components" className="text-sm">
                <Layers className="w-4 h-4 mr-1" />
                Components
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

            <TabsContent value="components" className="mt-6">
              <ItemComponentDetailsTab itemId={item?.id} />
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
