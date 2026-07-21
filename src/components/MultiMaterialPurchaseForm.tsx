import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useStores } from '@/hooks/useStores';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useMaterials } from '@/hooks/useMaterials';
import { useCreateMultipleMaterialPurchases } from '@/hooks/useMaterialPurchases';
import { useIsMobile } from '@/hooks/use-mobile';
import MaterialPurchaseBasicInfo from '@/components/materials/MaterialPurchaseBasicInfo';
import MaterialPurchaseItemsTable from '@/components/materials/MaterialPurchaseItemsTable';

export interface MaterialPurchaseItem {
  id: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface MultiMaterialPurchaseFormProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultMaterialId?: string;
}

const createEmptyItem = (defaultMaterialId?: string): MaterialPurchaseItem => ({
  id: Date.now().toString(),
  materialId: defaultMaterialId || '',
  materialName: '',
  unit: '',
  quantity: 0,
  unitCost: 0,
  totalCost: 0,
});

export default function MultiMaterialPurchaseForm({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultMaterialId
}: MultiMaterialPurchaseFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isMobile = useIsMobile();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    supplierId: '',
    storeId: '',
    paymentMethod: 'cash' as 'cash' | 'upi' | 'bank_transfer' | 'cheque',
    bankAccountId: ''
  });

  const [items, setItems] = useState<MaterialPurchaseItem[]>([
    createEmptyItem(defaultMaterialId)
  ]);

  const { data: stores = [] } = useStores();
  const { data: suppliers = [] } = useSuppliers();
  const { data: materials = [] } = useMaterials();
  const createPurchases = useCreateMultipleMaterialPurchases();

  const addItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof MaterialPurchaseItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === 'materialId') {
          const selectedMaterial = materials.find(m => m.id === value);
          updatedItem.materialName = selectedMaterial?.name || '';
          updatedItem.unit = selectedMaterial?.unit || '';
        }
        
        if (field === 'quantity' || field === 'unitCost') {
          updatedItem.totalCost = updatedItem.quantity * updatedItem.unitCost;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validItems = items.filter(item => 
      item.materialId && item.quantity > 0 && item.unitCost > 0
    );

    if (validItems.length === 0) {
      alert('Please add at least one valid material with quantity and cost');
      return;
    }

    await createPurchases.mutateAsync({
      invoiceNumber: formData.invoiceNumber || `MP-${Date.now()}`,
      invoiceDate: formData.invoiceDate,
      supplierId: formData.supplierId || undefined,
      storeId: formData.storeId || undefined,
      items: validItems.map(item => ({
        material_id: item.materialId,
        materialName: item.materialName,
        quantity: item.quantity,
        unit_cost: item.unitCost,
        total_cost: item.totalCost,
      }))
    });
    
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      supplierId: '',
      storeId: '',
      paymentMethod: 'cash',
      bankAccountId: ''
    });
    setItems([createEmptyItem(defaultMaterialId)]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  const dialogContent = (
    <DialogContent
      className={`${isMobile ? 'w-full h-[95vh] max-w-full' : 'max-w-5xl'} max-h-[95vh] overflow-y-auto futuristic-card`}
      onInteractOutside={e => e.preventDefault()}
    >
      <DialogHeader>
        <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Record Material Purchase
        </DialogTitle>
        <DialogDescription className="text-blue-300">
          Add multiple materials in a single purchase transaction
        </DialogDescription>
      </DialogHeader>
      
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className={isMobile ? 'p-0 pt-4' : 'pt-6 px-0'}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <MaterialPurchaseBasicInfo
              formData={formData}
              stores={stores}
              suppliers={suppliers}
              onFormDataChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
            />

            <MaterialPurchaseItemsTable
              items={items}
              materials={materials}
              onAddItem={addItem}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              getTotalAmount={getTotalAmount}
            />

            <Button
              type="submit"
              disabled={createPurchases.isPending}
              className="w-full cyber-button font-semibold text-primary-foreground"
            >
              {createPurchases.isPending ? 'Recording Purchase...' : 'Record Purchase'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </DialogContent>
  );

  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
