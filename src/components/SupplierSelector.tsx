
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Skeleton } from '@/components/ui/skeleton';

interface SupplierSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  includeAll?: boolean;
  /** Pass the active store ID to scope suppliers and isolate the cache per store. */
  storeId?: string;
}

export default function SupplierSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select supplier",
  includeAll = false,
  storeId,
}: SupplierSelectorProps) {
  const { data: suppliers = [], isLoading } = useSuppliers(storeId);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">
            All Suppliers
          </SelectItem>
        )}
        {suppliers.map((supplier) => (
          <SelectItem 
            key={supplier.id} 
            value={supplier.id}
          >
            {supplier.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
