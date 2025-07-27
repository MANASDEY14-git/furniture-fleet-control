import { useState } from 'react';
import { Package2, Edit, Copy, Trash2, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useItems } from '@/hooks/useItems';
import { useBOMByItem } from '@/hooks/useBOM';
import { useMaterials } from '@/hooks/useMaterials';
import EnhancedBOMManager from './EnhancedBOMManager';
import { BOMCostCalculator } from './BOMCostCalculator';

interface BOMListProps {
  searchTerm: string;
  selectedCategory: string;
}

export function BOMList({ searchTerm, selectedCategory }: BOMListProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showBOMEditor, setShowBOMEditor] = useState(false);
  
  const { data: items = [] } = useItems();
  const { data: materials = [] } = useMaterials();

  // Filter items based on search and category
  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300 flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Items & BOM Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-blue-500/30">
                <TableHead className="text-blue-200">Item Name</TableHead>
                <TableHead className="text-blue-200">SKU</TableHead>
                <TableHead className="text-blue-200">BOM Status</TableHead>
                <TableHead className="text-blue-200">Components</TableHead>
                <TableHead className="text-blue-200">Est. Cost</TableHead>
                <TableHead className="text-blue-200">Stock Status</TableHead>
                <TableHead className="text-blue-200">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <BOMListRow 
                  key={item.id} 
                  item={item} 
                  materials={materials}
                  onEdit={(item) => {
                    setSelectedItem(item);
                    setShowBOMEditor(true);
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* BOM Editor Dialog */}
      <Dialog open={showBOMEditor} onOpenChange={setShowBOMEditor}>
        <DialogContent className="max-w-4xl bg-slate-800 border-blue-500/30">
          <DialogHeader>
            <DialogTitle className="text-cyan-300">
              Manage BOM - {selectedItem?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <EnhancedBOMManager 
              item={selectedItem} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BOMListRow({ item, materials, onEdit }: { 
  item: any; 
  materials: any[]; 
  onEdit: (item: any) => void;
}) {
  const { data: bom } = useBOMByItem(item.id);
  
  const componentCount = bom?.bom_components?.length || 0;
  const hasBOM = componentCount > 0;
  
  // Calculate estimated cost
  const estimatedCost = bom?.bom_components?.reduce((total, component) => {
    const material = materials.find(m => m.id === component.material_id);
    return total + (material?.cost_price || 0) * component.quantity_required;
  }, 0) || 0;

  // Check stock availability
  const hasStockIssues = bom?.bom_components?.some(component => {
    const material = materials.find(m => m.id === component.material_id);
    return (material?.quantity_available || 0) < component.quantity_required;
  }) || false;

  return (
    <TableRow className="border-blue-500/20 hover:bg-slate-700/30">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <Package2 className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-white">{item.name}</div>
            <div className="text-sm text-blue-300">
              Stock: {item.quantity_available}
            </div>
          </div>
        </div>
      </TableCell>
      
      <TableCell className="text-blue-200">
        {item.sku || 'N/A'}
      </TableCell>
      
      <TableCell>
        {hasBOM ? (
          <Badge variant="secondary" className="bg-green-600/20 text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            No BOM
          </Badge>
        )}
      </TableCell>
      
      <TableCell className="text-blue-200">
        {componentCount} components
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-1 text-green-300">
          <DollarSign className="h-3 w-3" />
          {estimatedCost.toFixed(2)}
        </div>
      </TableCell>
      
      <TableCell>
        {hasStockIssues ? (
          <Badge variant="destructive" className="bg-red-600/20 text-red-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Stock Issues
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-green-600/20 text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Available
          </Badge>
        )}
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            className="text-blue-200 hover:text-white hover:bg-blue-800/30"
          >
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-200 hover:text-white hover:bg-blue-800/30"
          >
            <Copy className="h-4 w-4" />
          </Button>
          
          <BOMCostCalculator item={item} />
        </div>
      </TableCell>
    </TableRow>
  );
}