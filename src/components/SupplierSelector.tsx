
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Skeleton } from '@/components/ui/skeleton';

interface SupplierSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  includeAll?: boolean;
}

export default function SupplierSelector({ 
  value, 
  onValueChange, 
  placeholder = "Select supplier",
  includeAll = false 
}: SupplierSelectorProps) {
  const { data: suppliers = [], isLoading } = useSuppliers();

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
