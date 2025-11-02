import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Item } from '@/hooks/useItems';

interface ExistingItemSelectorProps {
  itemId: string;
  filteredItems: Item[];
  onItemIdChange: (itemId: string) => void;
}

export default function ExistingItemSelector({ itemId, filteredItems, onItemIdChange }: ExistingItemSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="existingItem" className="text-blue-200">Select Item *</Label>
      {filteredItems.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground bg-slate-800/50 border border-blue-500/30 rounded-md">
          No items available for the selected supplier/store
        </div>
      ) : (
        <Select value={itemId} onValueChange={onItemIdChange} required>
          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
            <SelectValue placeholder="Select existing item" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-slate-800 border-blue-500/30">
            {filteredItems.map((item) => (
              <SelectItem key={item.id} value={item.id} className="text-blue-100 focus:bg-blue-800/30">
                {item.name} (Stock: {item.quantity_available})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}