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
        <Label htmlFor="store" className="text-blue-200">Store *</Label>
        <Select 
          value={formData.storeId} 
          onValueChange={(value) => onFormDataChange({ storeId: value })} 
          required
        >
          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
            <SelectValue placeholder="Select store" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-blue-500/30">
            {stores.map((store) => (
              <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-blue-800/30">
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier" className="text-blue-200">Supplier *</Label>
        <SupplierSelector 
          value={formData.supplierId} 
          onValueChange={(value) => onFormDataChange({ supplierId: value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoiceNumber" className="text-blue-200">Invoice Number *</Label>
        <Input
          id="invoiceNumber"
          placeholder="Enter invoice number"
          value={formData.invoiceNumber}
          onChange={(e) => onFormDataChange({ invoiceNumber: e.target.value })}
          required
          className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date" className="text-blue-200">Purchase Date *</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => onFormDataChange({ date: e.target.value })}
          required
          className="neon-border bg-slate-800/50 text-blue-100"
        />
      </div>
    </div>
  );
}