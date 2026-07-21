import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCustomers, useCreateCustomer, type Customer } from '@/hooks/useCustomers';

interface CustomerSelectorProps {
  storeId: string;
  selectedCustomerId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  onCustomerSelect: (customer: Customer | null) => void;
  onFieldChange: (field: 'customerName' | 'customerPhone' | 'customerAddress', value: string) => void;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
}

export default function CustomerSelector({
  storeId,
  selectedCustomerId,
  customerName,
  customerPhone,
  customerAddress,
  onCustomerSelect,
  onFieldChange,
  className = '',
  inputClassName = '',
  labelClassName = '',
}: CustomerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: customers = [] } = useCustomers(storeId);
  const createCustomer = useCreateCustomer();

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lower = searchTerm.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(lower) ||
      (c.phone && c.phone.includes(searchTerm))
    );
  }, [customers, searchTerm]);

  const handleSelectCustomer = (customer: Customer) => {
    onCustomerSelect(customer);
    setOpen(false);
    setSearchTerm('');
  };

  const handleClearCustomer = () => {
    onCustomerSelect(null);
  };

  const handleCreateAndSelect = async () => {
    if (!customerName.trim() || !storeId) return;
    try {
      const newCustomer = await createCustomer.mutateAsync({
        store_id: storeId,
        name: customerName.trim(),
        phone: customerPhone || null,
        address: customerAddress || null,
      });
      onCustomerSelect(newCustomer);
    } catch (e) {
      // toast handled in hook
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Customer Selector */}
      <div className="space-y-2">
        <Label className={labelClassName}>Customer</Label>
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn(
                  'flex-1 justify-between',
                  !selectedCustomerId && 'text-muted-foreground',
                  inputClassName,
                )}
              >
                {selectedCustomer
                  ? `${selectedCustomer.name}${selectedCustomer.phone ? ` (${selectedCustomer.phone})` : ''}`
                  : 'Select existing customer...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>No customers found.</CommandEmpty>
                  <CommandGroup heading={`${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? 's' : ''}`}>
                    {filteredCustomers.map(customer => (
                      <CommandItem
                        key={customer.id}
                        value={customer.id}
                        onSelect={() => handleSelectCustomer(customer)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedCustomerId === customer.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{customer.name}</span>
                          {customer.phone && (
                            <span className="text-xs text-muted-foreground">{customer.phone}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedCustomerId && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClearCustomer} className="text-xs">
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Manual fields - always shown, auto-filled when customer selected */}
      <div className="space-y-2">
        <Label className={labelClassName}>Customer Name</Label>
        <Input
          value={customerName}
          onChange={e => onFieldChange('customerName', e.target.value)}
          placeholder="Customer name"
          className={inputClassName}
          disabled={!!selectedCustomerId}
        />
      </div>

      <div className="space-y-2">
        <Label className={labelClassName}>Phone</Label>
        <Input
          value={customerPhone}
          onChange={e => onFieldChange('customerPhone', e.target.value)}
          placeholder="Phone number"
          className={inputClassName}
          disabled={!!selectedCustomerId}
        />
      </div>

      <div className="space-y-2">
        <Label className={labelClassName}>Customer Address</Label>
        <Input
          value={customerAddress}
          onChange={e => onFieldChange('customerAddress', e.target.value)}
          placeholder="Full delivery address"
          className={inputClassName}
          disabled={!!selectedCustomerId}
        />
      </div>

      {/* Save as new customer button - shown when typing new name without selecting */}
      {!selectedCustomerId && customerName.trim() && storeId && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCreateAndSelect}
          disabled={createCustomer.isPending}
          className="w-full"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {createCustomer.isPending ? 'Saving...' : `Save "${customerName.trim()}" as new customer`}
        </Button>
      )}
    </div>
  );
}
