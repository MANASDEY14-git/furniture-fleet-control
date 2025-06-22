
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Store } from '@/types';



interface StoreSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  stores: Store[];
  placeholder?: string;
  isLoading?: boolean;
}

export default function StoreSelector({ 
  value, 
  onValueChange, 
  stores = [], 
  placeholder = "All stores",
  isLoading = false
}: StoreSelectorProps) {
  if (isLoading) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Loading stores..." />
        </SelectTrigger>
      </Select>
    );
  }

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
