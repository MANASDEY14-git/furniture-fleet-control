import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  quantity_available: number;
}

interface StockLedgerItemSelectorProps {
  selectedItemId: string;
  items: Item[];
  onItemChange: (itemId: string) => void;
}

export default function StockLedgerItemSelector({
  selectedItemId,
  items,
  onItemChange,
}: StockLedgerItemSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getStockLevel = (quantity: number) => {
    if (quantity === 0) return { level: 'Out', variant: 'destructive' as const, color: 'text-red-400' };
    if (quantity < 5) return { level: 'Low', variant: 'destructive' as const, color: 'text-orange-400' };
    if (quantity < 20) return { level: 'Medium', variant: 'secondary' as const, color: 'text-yellow-400' };
    return { level: 'High', variant: 'default' as const, color: 'text-green-400' };
  };

  const selectedItem = selectedItemId === 'all' 
    ? { id: 'all', name: 'All Items' } 
    : items.find(item => item.id === selectedItemId);

  const displayValue = selectedItem?.name || 'Select item...';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-slate-700 border-blue-500/30 text-white hover:bg-slate-600"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-slate-800 border-blue-500/30" align="start">
        <Command className="bg-slate-800" shouldFilter={false}>
          <CommandInput 
            placeholder="Search items..." 
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="text-white"
          />
          <CommandList>
            <CommandEmpty className="text-blue-200 py-6 text-center text-sm">
              No items found.
            </CommandEmpty>
            <CommandGroup>
              {/* All Items Option */}
              <CommandItem
                value="All Items"
                keywords={['all', 'items', 'all items']}
                onSelect={() => {
                  onItemChange('all');
                  setSearchTerm('');
                  setOpen(false);
                }}
                className="text-white hover:bg-slate-700 cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedItemId === 'all' ? "opacity-100" : "opacity-0"
                  )}
                />
                <Package className="mr-2 h-4 w-4 text-blue-400" />
                <span className="font-medium">All Items</span>
              </CommandItem>

              {/* Individual Items */}
              {items
                .filter(item => 
                  !searchTerm || 
                  item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  item.id.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((item) => {
                  const stockInfo = getStockLevel(item.quantity_available);
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      keywords={[item.id, item.name]}
                      onSelect={() => {
                        onItemChange(item.id);
                        setSearchTerm('');
                        setOpen(false);
                      }}
                      className="text-white hover:bg-slate-700 cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedItemId === item.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{item.name}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <Badge variant={stockInfo.variant} className="text-xs">
                            {stockInfo.level}
                          </Badge>
                          <span className={cn("text-xs font-medium", stockInfo.color)}>
                            {item.quantity_available}
                          </span>
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
  );
}
