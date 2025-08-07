import { useState } from 'react';
import { Search, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useItems } from '@/hooks/useItems';
import { useCategories } from '@/hooks/useCategories';
import { useEnhancedBOMList } from '@/hooks/useEnhancedBOM';
import ItemBasicInfoForm from '@/components/ItemBasicInfoForm';
import { useCreateItem } from '@/hooks/useItems';

interface ItemSelectionStepProps {
  onItemSelect: (item: { id: string; name: string }) => void;
}

export function ItemSelectionStep({ onItemSelect }: ItemSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateItem, setShowCreateItem] = useState(false);
  
  const { data: items = [] } = useItems();
  const { data: categories = [] } = useCategories();
  const { data: bomList = [] } = useEnhancedBOMList();
  const createItem = useCreateItem();

  // Filter items based on search term
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get items that already have BOMs
  const itemsWithBOMs = new Set(bomList.map(bom => bom.item_id));

  // Helper function to get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  const handleCreateItem = async (itemData: any) => {
    try {
      const newItem = await createItem.mutateAsync(itemData);
      setShowCreateItem(false);
      onItemSelect({ id: newItem.id, name: newItem.name });
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Select an Item for BOM Creation
        </h3>
        <p className="text-muted-foreground">
          Choose an existing item or create a new one to build its Bill of Materials
        </p>
      </div>

      {/* Search and Create Item */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={showCreateItem} onOpenChange={setShowCreateItem}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Item</DialogTitle>
            </DialogHeader>
            <ItemBasicInfoForm
              onSubmit={handleCreateItem}
              onCancel={() => setShowCreateItem(false)}
              isLoading={createItem.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Items Table */}
      <Card>
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Items Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No items match your search criteria' : 'Create your first item to get started'}
              </p>
              <Button onClick={() => setShowCreateItem(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Item
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>BOM Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const hasBOM = itemsWithBOMs.has(item.id);
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCategoryName(item.category_id)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono ${
                          item.quantity_available < 1 ? 'text-destructive' : 'text-foreground'
                        }`}>
                          {item.quantity_available} units
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasBOM ? (
                          <Badge variant="secondary">Has BOM</Badge>
                        ) : (
                          <Badge variant="outline">No BOM</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => onItemSelect({ id: item.id, name: item.name })}
                          variant={hasBOM ? "outline" : "default"}
                        >
                          {hasBOM ? 'Edit BOM' : 'Create BOM'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}