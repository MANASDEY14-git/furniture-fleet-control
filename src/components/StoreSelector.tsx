
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { stores } from '@/data/mockData';

interface StoreSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export default function StoreSelector({ value, onValueChange, placeholder = "All stores" }: StoreSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Stores</SelectItem>
        {stores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            {store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
