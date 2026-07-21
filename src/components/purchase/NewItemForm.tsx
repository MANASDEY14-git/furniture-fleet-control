import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';

interface NewItemFormProps {
  newItemData: {
    name: string;
    categoryId: string;
    sellingPrice: number;
  };
  onNewItemDataChange: (updates: Partial<NewItemFormProps['newItemData']>) => void;
}

export default function NewItemForm({ newItemData, onNewItemDataChange }: NewItemFormProps) {
  const { data: categories = [] } = useCategories();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="itemName">Item Name *</Label>
        <Input
          id="itemName"
          placeholder="Enter item name"
          value={newItemData.name}
          onChange={(e) => onNewItemDataChange({ name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select 
          value={newItemData.categoryId} 
          onValueChange={(value) => onNewItemDataChange({ categoryId: value })} 
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sellingPrice">Selling Price *</Label>
        <Input
          id="sellingPrice"
          type="number"
          step="0.01"
          placeholder="Enter selling price"
          value={newItemData.sellingPrice || ''}
          onChange={(e) => onNewItemDataChange({ sellingPrice: parseFloat(e.target.value) || 0 })}
          required
          min="0"
        />
      </div>
    </div>
  );
}
