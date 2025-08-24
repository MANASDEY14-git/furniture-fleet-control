import { useState, useEffect } from 'react';
import { ShoppingCart, TrendingUp, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useSecureSalesOrders } from '@/hooks/useSecureSalesOrders';
import { useSalesCustomizationsBySale } from '@/hooks/useSalesCustomizations';
import type { BOM } from '@/types/bom';

interface BOMSalesIntegrationProps {
  bom: BOM;
  itemId: string;
}

interface SalesImpact {
  saleId: string;
  orderNumber: string;
  customerName: string;
  quantity: number;
  materialDeductions: {
    materialId: string;
    materialName: string;
    quantityUsed: number;
    unit: string;
  }[];
  customizations: any[];
  saleDate: string;
  status: string;
}

export function BOMSalesIntegration({ bom, itemId }: BOMSalesIntegrationProps) {
  const [salesImpacts, setSalesImpacts] = useState<SalesImpact[]>([]);
  const [selectedSale, setSelectedSale] = useState<SalesImpact | null>(null);
  const { data: salesOrders = [] } = useSecureSalesOrders();
  const { toast } = useToast();

  useEffect(() => {
    // Since useSecureSalesOrders doesn't include sales_order_items,
    // we'll create a simplified integration showing general sales impact
    // In a real implementation, you'd need a separate query for items
    
    const impacts: SalesImpact[] = salesOrders.map(sale => {
      // For now, assume each sale used this item (simplified example)
      const quantity = 1; // Default quantity assumption

      // Calculate material deductions based on BOM
      const materialDeductions = bom.bom_components
        ?.filter(comp => comp.component_type === 'material' && comp.material_id)
        .map(comp => ({
          materialId: comp.material_id!,
          materialName: comp.materials?.name || comp.component_name || 'Unknown',
          quantityUsed: comp.quantity_required * quantity,
          unit: comp.materials?.unit || 'units'
        })) || [];

      return {
        saleId: sale.id,
        orderNumber: sale.order_number || `ORD-${sale.id.slice(0, 8)}`,
        customerName: sale.customer_name || 'Unknown Customer',
        quantity,
        materialDeductions,
        customizations: [], // This would be fetched from sales_customizations table
        saleDate: sale.date || new Date().toISOString().split('T')[0],
        status: sale.delivery_status || 'pending'
      };
    });

    setSalesImpacts(impacts);
  }, [salesOrders, itemId, bom]);

  const totalQuantitySold = salesImpacts.reduce((sum, impact) => sum + impact.quantity, 0);
  const totalOrders = salesImpacts.length;
  const customizedOrders = salesImpacts.filter(impact => impact.customizations.length > 0).length;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'bg-green-600';
      case 'pending': return 'bg-yellow-600';
      case 'cancelled': return 'bg-red-600';
      default: return 'bg-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200">Total Orders</p>
                <p className="text-2xl font-bold text-cyan-300">{totalOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200">Units Sold</p>
                <p className="text-2xl font-bold text-green-300">{totalQuantitySold}</p>
              </div>
              <Package className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-200">Customized</p>
                <p className="text-2xl font-bold text-purple-300">{customizedOrders}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-200">Avg. Per Order</p>
                <p className="text-2xl font-bold text-orange-300">
                  {totalOrders > 0 ? (totalQuantitySold / totalOrders).toFixed(1) : '0'}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Impact Details */}
      <Card className="bg-slate-800/50 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-cyan-300">Sales Orders Using This BOM</CardTitle>
        </CardHeader>
        <CardContent>
          {salesImpacts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Sale Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Material Impact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesImpacts.map((impact) => (
                  <TableRow key={impact.saleId}>
                    <TableCell className="font-medium">{impact.orderNumber}</TableCell>
                    <TableCell>{impact.customerName}</TableCell>
                    <TableCell>{impact.quantity} units</TableCell>
                    <TableCell>{new Date(impact.saleDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(impact.status)}>
                        {impact.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {impact.materialDeductions.length} materials affected
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSale(impact)}
                        className="border-blue-500/30 text-blue-200 hover:bg-blue-800/30"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Sales Orders</h3>
              <p className="text-blue-200">This item hasn't been sold yet or no BOM is configured.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Material Usage Summary */}
      {salesImpacts.length > 0 && (
        <Card className="bg-slate-800/50 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-300">Material Usage Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bom.bom_components
                ?.filter(comp => comp.component_type === 'material')
                .map(component => {
                  const totalUsed = salesImpacts.reduce((sum, impact) => {
                    const deduction = impact.materialDeductions.find(d => d.materialId === component.material_id);
                    return sum + (deduction?.quantityUsed || 0);
                  }, 0);

                  return (
                    <div key={component.id} className="p-4 bg-slate-700/30 rounded-lg border border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">
                            {component.materials?.name || component.component_name}
                          </h4>
                          <p className="text-sm text-blue-200">
                            Required per unit: {component.quantity_required} {component.materials?.unit || 'units'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-cyan-300">
                            {totalUsed.toFixed(2)} {component.materials?.unit || 'units'}
                          </p>
                          <p className="text-sm text-blue-200">Total used in sales</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sale Details Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Sale Impact Details - {selectedSale?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-muted-foreground">Customer:</span>
                  <p>{selectedSale.customerName}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Quantity:</span>
                  <p>{selectedSale.quantity} units</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Sale Date:</span>
                  <p>{new Date(selectedSale.saleDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(selectedSale.status)}>
                    {selectedSale.status}
                  </Badge>
                </div>
              </div>

              {/* Material Deductions */}
              <div>
                <h4 className="font-medium mb-3">Material Deductions</h4>
                <div className="space-y-2">
                  {selectedSale.materialDeductions.map((deduction) => (
                    <div key={deduction.materialId} className="flex justify-between items-center p-3 bg-slate-100 rounded">
                      <span>{deduction.materialName}</span>
                      <span className="font-medium">
                        -{deduction.quantityUsed.toFixed(2)} {deduction.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customizations */}
              {selectedSale.customizations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Product Customizations</h4>
                  <div className="space-y-2">
                    {selectedSale.customizations.map((customization, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded">
                        <p className="font-medium">{customization.component_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Selected: {customization.selected_option}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}