import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  quantity_available: number;
}

interface ExistingItemSelectorProps {
  itemId: string;
  filteredItems: Item[];
  onItemIdChange: (itemId: string) => void;
}

export default function ExistingItemSelector({ itemId, filteredItems, onItemIdChange }: ExistingItemSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  const selectedItem = filteredItems.find(item => item.id === itemId);

  const getStockLevel = (quantity: number) => {
    if (quantity <= 10) return { level: 'Low', variant: 'destructive' as const, className: 'bg-red-500/10 text-red-600 hover:bg-red-500/20' };
    if (quantity <= 50) return { level: 'Medium', variant: 'secondary' as const, className: 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20' };
    return { level: 'High', variant: 'default' as const, className: 'bg-green-500/10 text-green-600 hover:bg-green-500/20' };
  };

  return (
    <div className="space-y-2">
      <Label className="text-blue-200">Select Item *</Label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between neon-border bg-slate-800/50 text-blue-100",
              !itemId && "text-blue-400"
            )}
          >
            {selectedItem ? `${selectedItem.name} (Stock: ${selectedItem.quantity_available})` : "Select item..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 z-50" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search items..." 
              className="h-9"
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                {filteredItems.length === 0 
                  ? "No items available for the selected supplier/store"
                  : "No items match your search"}
              </CommandEmpty>
              <CommandGroup heading={filteredItems.length > 0 ? `${filteredItems.length} items available` : undefined}>
                {filteredItems
                  .filter(item => 
                    !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((item) => {
                    const stockInfo = getStockLevel(item.quantity_available);
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => {
                          onItemIdChange(item.id);
                          setSearchTerm('');
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            itemId === item.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center justify-between w-full">
                          <span>{item.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={stockInfo.variant} className={cn("text-xs", stockInfo.className)}>
                              {stockInfo.level}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Stock: {item.quantity_available}</span>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}