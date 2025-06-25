
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
      <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-slate-800 border-blue-500/30">
        {includeAll && (
          <SelectItem value="all" className="text-blue-100 focus:bg-blue-800/30">
            All Suppliers
          </SelectItem>
        )}
        {suppliers.map((supplier) => (
          <SelectItem 
            key={supplier.id} 
            value={supplier.id} 
            className="text-blue-100 focus:bg-blue-800/30"
          >
            {supplier.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
