import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Item } from '@/hooks/useItems';

interface ExistingItemSelectorProps {
  itemId: string;
  filteredItems: Item[];
  onItemIdChange: (itemId: string) => void;
}

export default function ExistingItemSelector({ itemId, filteredItems, onItemIdChange }: ExistingItemSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter items based on search term
  const searchedItems = useMemo(() => {
    if (!searchTerm) return filteredItems;
    
    const lowerSearch = searchTerm.toLowerCase();
    return filteredItems.filter(item => 
      item.name.toLowerCase().includes(lowerSearch)
    );
  }, [filteredItems, searchTerm]);

  return (
    <div className="space-y-2">
      <Label htmlFor="existingItem" className="text-blue-200">Select Item *</Label>
      
      {/* Search Input */}
      {filteredItems.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400" />
          <Input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
          />
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground bg-slate-800/50 border border-blue-500/30 rounded-md">
          No items available for the selected supplier/store
        </div>
      ) : searchedItems.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground bg-slate-800/50 border border-blue-500/30 rounded-md">
          No items match your search
        </div>
      ) : (
        <Select value={itemId} onValueChange={onItemIdChange} required>
          <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
            <SelectValue placeholder="Select existing item" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-slate-800 border-blue-500/30 max-h-[300px]">
            {searchedItems.map((item) => (
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