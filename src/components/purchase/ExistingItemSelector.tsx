import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Item } from '@/hooks/useItems';

interface ExistingItemSelectorProps {
  itemId: string;
  filteredItems: Item[];
  onItemIdChange: (itemId: string) => void;
}

export default function ExistingItemSelector({ itemId, filteredItems, onItemIdChange }: ExistingItemSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);

  const selectedItem = filteredItems.find(item => item.id === itemId);

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
                  .map((item) => (
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
                      {item.name} (Stock: {item.quantity_available})
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}