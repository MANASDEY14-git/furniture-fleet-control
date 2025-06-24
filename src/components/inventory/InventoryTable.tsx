
import React from 'react';
import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import ItemForm from '@/components/ItemForm';
import type { Item } from '@/hooks/useItems';
import type { Store, Category } from '@/types';

interface InventoryTableProps {
  items: Item[];
  stores: Store[];
  categories: Category[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedItems: string[];
  onItemSelection: (itemId: string, checked: boolean) => void;
  onDeleteItem: (id: string) => void;
  isLoading: boolean;
}

export default function InventoryTable({
  items,
  stores,
  categories,
  searchTerm,
  onSearchTermChange,
  selectedItems,
  onItemSelection,
  onDeleteItem,
  isLoading
}: InventoryTableProps) {
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stores.find(store => store.id === item.store_id)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categories.find(cat => cat.id === item.category_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-blue-300">Loading inventory...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="neon-border bg-slate-800/50 text-blue-100 max-w-md"
        />
      </div>

      <div className="overflow-x-auto">
        <Table className="data-grid">
          <TableHeader>
            <TableRow className="border-blue-500/30">
              <TableHead className="text-blue-200 w-12">
                <Checkbox
                  checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const allItemIds = filteredItems.map(item => item.id);
                      allItemIds.forEach(id => onItemSelection(id, true));
                    } else {
                      selectedItems.forEach(id => onItemSelection(id, false));
                    }
                  }}
                />
              </TableHead>
              <TableHead className="text-blue-200">Name</TableHead>
              <TableHead className="text-blue-200">Store</TableHead>
              <TableHead className="text-blue-200">Category</TableHead>
              <TableHead className="text-blue-200">Quantity</TableHead>
              <TableHead className="text-blue-200">Cost Price</TableHead>
              <TableHead className="text-blue-200">Selling Price</TableHead>
              <TableHead className="text-right text-blue-200">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => {
              const store = stores.find(s => s.id === item.store_id);
              const category = categories.find(c => c.id === item.category_id);
              const isLowStock = item.quantity_available < 10;
              
              return (
                <TableRow 
                  key={item.id} 
                  className={`border-blue-500/20 hover:bg-blue-800/20 transition-colors ${
                    isLowStock ? 'bg-orange-900/10' : ''
                  }`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => onItemSelection(item.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-blue-100">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {isLowStock && (
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-blue-200">{store?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-blue-200">{category?.name || 'Unknown'}</TableCell>
                  <TableCell className={`${isLowStock ? 'text-orange-300 font-semibold' : 'text-blue-200'}`}>
                    {item.quantity_available}
                  </TableCell>
                  <TableCell className="text-blue-200">${item.cost_price.toLocaleString()}</TableCell>
                  <TableCell className="text-blue-200">${item.selling_price.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ItemForm
                        item={item}
                        trigger={
                          <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        }
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="futuristic-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-cyan-300">Delete Item</AlertDialogTitle>
                            <AlertDialogDescription className="text-blue-200">
                              Are you sure you want to delete "{item.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 text-blue-100 border-blue-500/30 hover:bg-slate-600">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteItem(item.id)} className="bg-red-600 hover:bg-red-700 text-white">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredItems.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-blue-300">No items found. Add your first item above.</p>
        </div>
      )}
    </>
  );
}
