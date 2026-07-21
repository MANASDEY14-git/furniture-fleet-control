import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SupplierSelector from '@/components/SupplierSelector';
import { useStores } from '@/hooks/useStores';

interface PurchaseFormHeaderProps {
  formData: {
    storeId: string;
    supplierId: string;
    invoiceNumber: string;
    date: string;
  };
  onFormDataChange: (updates: Partial<PurchaseFormHeaderProps['formData']>) => void;
}

export default function PurchaseFormHeader({ formData, onFormDataChange }: PurchaseFormHeaderProps) {
  const { data: stores = [] } = useStores();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="store">Store *</Label>
        <Select 
          value={formData.storeId} 
          onValueChange={(value) => onFormDataChange({ storeId: value })} 
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select store" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier *</Label>
        <SupplierSelector 
          value={formData.supplierId} 
          onValueChange={(value) => onFormDataChange({ supplierId: value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoiceNumber">Invoice Number *</Label>
        <Input
          id="invoiceNumber"
          placeholder="Enter invoice number"
          value={formData.invoiceNumber}
          onChange={(e) => onFormDataChange({ invoiceNumber: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Purchase Date *</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => onFormDataChange({ date: e.target.value })}
          required
        />
      </div>
    </div>
  );
}
