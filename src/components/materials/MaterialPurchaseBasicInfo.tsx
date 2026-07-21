import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';

interface Store {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface FormData {
  invoiceNumber: string;
  invoiceDate: string;
  supplierId: string;
  storeId: string;
}

interface MaterialPurchaseBasicInfoProps {
  formData: FormData;
  stores: Store[];
  suppliers: Supplier[];
  onFormDataChange: (updates: Partial<FormData>) => void;
}

export default function MaterialPurchaseBasicInfo({
  formData,
  stores,
  suppliers,
  onFormDataChange
}: MaterialPurchaseBasicInfoProps) {
  const isMobile = useIsMobile();

  return (
    <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4'} gap-4 p-4 rounded-lg bg-slate-800/30 border border-blue-500/20`}>
      <div className="space-y-2">
        <Label htmlFor="invoiceNumber" className="text-blue-200">Invoice Number</Label>
        <Input
          id="invoiceNumber"
          placeholder="Auto-generated if empty"
          value={formData.invoiceNumber}
          onChange={e => onFormDataChange({ invoiceNumber: e.target.value })}
          className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoiceDate" className="text-blue-200">Invoice Date *</Label>
        <Input
          id="invoiceDate"
          type="date"
          value={formData.invoiceDate}
          onChange={e => onFormDataChange({ invoiceDate: e.target.value })}
          required
          className="neon-border bg-slate-800/50 text-blue-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="supplier" className="text-blue-200">Supplier</Label>
        <Select
          value={formData.supplierId}
          onValueChange={value => onFormDataChange({ supplierId: value === 'none' ? '' : value })}
        >
          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
            <SelectValue placeholder="Select supplier" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-blue-500/30 z-50">
            <SelectItem value="none" className="text-blue-100 focus:bg-blue-800/30">No Supplier</SelectItem>
            {suppliers.map(supplier => (
              <SelectItem key={supplier.id} value={supplier.id} className="text-blue-100 focus:bg-blue-800/30">
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="store" className="text-blue-200">Store</Label>
        <Select
          value={formData.storeId}
          onValueChange={value => onFormDataChange({ storeId: value === 'none' ? '' : value })}
        >
          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
            <SelectValue placeholder="Select store" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-blue-500/30 z-50">
            <SelectItem value="none" className="text-blue-100 focus:bg-blue-800/30">No Store</SelectItem>
            {stores.map(store => (
              <SelectItem key={store.id} value={store.id} className="text-blue-100 focus:bg-blue-800/30">
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
