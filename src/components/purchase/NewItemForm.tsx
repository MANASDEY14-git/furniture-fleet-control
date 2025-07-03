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
        <Label htmlFor="itemName" className="text-blue-200">Item Name *</Label>
        <Input
          id="itemName"
          placeholder="Enter item name"
          value={newItemData.name}
          onChange={(e) => onNewItemDataChange({ name: e.target.value })}
          required
          className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category" className="text-blue-200">Category *</Label>
        <Select 
          value={newItemData.categoryId} 
          onValueChange={(value) => onNewItemDataChange({ categoryId: value })} 
          required
        >
          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-blue-500/30">
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id} className="text-blue-100 focus:bg-blue-800/30">
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sellingPrice" className="text-blue-200">Selling Price *</Label>
        <Input
          id="sellingPrice"
          type="number"
          step="0.01"
          placeholder="Enter selling price"
          value={newItemData.sellingPrice || ''}
          onChange={(e) => onNewItemDataChange({ sellingPrice: parseFloat(e.target.value) || 0 })}
          required
          min="0"
          className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
        />
      </div>
    </div>
  );
}