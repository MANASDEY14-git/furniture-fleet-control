import React from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Material } from '@/hooks/useMaterials';
import { useMaterialPurchases } from '@/hooks/useMaterialPurchases';
import { formatCurrency } from '@/utils/currencyUtils';
import { format } from 'date-fns';
import MultiMaterialPurchaseForm from '@/components/MultiMaterialPurchaseForm';

interface MaterialPurchasesTabProps {
  material: Material;
}

export default function MaterialPurchasesTab({ material }: MaterialPurchasesTabProps) {
  const { data: allPurchases = [], isLoading } = useMaterialPurchases();
  
  const purchases = allPurchases.filter(p => p.material_id === material.id);

  return (
    <div className="h-full flex flex-col">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          {purchases.length} purchase{purchases.length !== 1 ? 's' : ''} recorded
        </p>
        <MultiMaterialPurchaseForm
          trigger={
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Purchase
            </Button>
          }
          defaultMaterialId={material.id}
        />
      </div>

      {/* Purchases Table */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading purchases...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No purchases recorded</p>
            <p className="text-sm text-muted-foreground">Add a purchase to track inventory</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Invoice #</TableHead>
                <TableHead className="text-xs">Supplier</TableHead>
                <TableHead className="text-xs text-right">Qty</TableHead>
                <TableHead className="text-xs text-right">Unit Cost</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id} className="text-sm">
                  <TableCell className="py-2">
                    {format(new Date(purchase.date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="py-2">
                    {purchase.invoice_number || '-'}
                  </TableCell>
                  <TableCell className="py-2">
                    {purchase.suppliers?.name || '-'}
                  </TableCell>
                  <TableCell className="py-2 text-right font-medium text-green-600">
                    +{purchase.quantity}
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    {formatCurrency(purchase.unit_cost)}
                  </TableCell>
                  <TableCell className="py-2 text-right font-medium">
                    {formatCurrency(purchase.total_cost)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
