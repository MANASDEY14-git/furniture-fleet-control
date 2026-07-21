import { useState } from 'react';
import { Factory, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/utils/currencyUtils';
import { useOrderMaterialUsage, useOrderBOMSnapshots, useOrderMaterialCost } from '@/hooks/useOrderProductionData';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProductionTabProps {
  orderId: string;
  totalSellingPrice: number;
}

export default function ProductionTab({ orderId, totalSellingPrice }: ProductionTabProps) {
  const { data: materialUsage = [], isLoading: usageLoading } = useOrderMaterialUsage(orderId);
  const { data: bomSnapshots = [], isLoading: snapshotsLoading } = useOrderBOMSnapshots(orderId);
  const { data: costData, isLoading: costLoading } = useOrderMaterialCost(orderId);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const isMobile = useIsMobile();

  const isLoading = usageLoading || snapshotsLoading || costLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  const totalMaterialCost = costData?.total_material_cost || 0;
  const totalMaterialsUsed = materialUsage.length;
  const grossMargin = costData?.margin ?? (totalSellingPrice - totalMaterialCost);
  const bomVersion = bomSnapshots.length > 0 ? bomSnapshots[0].bom_version : null;

  // Group usage by item
  const groupedUsage: Record<string, { itemName: string; itemQty: number; rows: typeof materialUsage }> = {};
  materialUsage.forEach((row: any) => {
    const key = row.sales_order_item_id;
    if (!groupedUsage[key]) {
      groupedUsage[key] = { itemName: row._itemName, itemQty: row._itemQty, rows: [] };
    }
    groupedUsage[key].rows.push(row);
  });

  if (materialUsage.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Factory className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No production data recorded for this order.</p>
        <p className="text-sm mt-1">Production data is captured when BOM-backed items are ordered.</p>
      </div>
    );
  }

  const sourceLabel = (source: string) => {
    switch (source) {
      case 'customized': return <Badge variant="outline" className="text-xs border-primary/50 text-primary">Customized</Badge>;
      case 'fixed': return <Badge variant="secondary" className="text-xs">Fixed</Badge>;
      default: return <Badge variant="secondary" className="text-xs">Default</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex items-center gap-6'} p-3 bg-muted rounded-lg`}>
        {bomVersion && (
          <div className={isMobile ? 'col-span-2' : ''}>
            <Badge variant="outline" className="text-xs">
              <Factory className="w-3 h-3 mr-1" />
              BOM v{bomVersion}
            </Badge>
          </div>
        )}
        <div className={isMobile ? 'text-center' : ''}>
          <p className="text-xs text-muted-foreground">Material Cost</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalMaterialCost)}</p>
        </div>
        <div className={isMobile ? 'text-center' : ''}>
          <p className="text-xs text-muted-foreground">Materials Used</p>
          <p className="text-lg font-bold text-foreground">{totalMaterialsUsed}</p>
        </div>
        {totalSellingPrice > 0 && (
          <div className={isMobile ? 'col-span-2 text-center' : ''}>
            <p className="text-xs text-muted-foreground">Gross Margin</p>
            <p className={`text-lg font-bold ${grossMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
              {formatCurrency(grossMargin)}
            </p>
          </div>
        )}
      </div>

      {/* Material Breakdown by Item */}
      {Object.entries(groupedUsage).map(([itemId, group]) => (
        <div key={itemId}>
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{group.itemName}</span>
            <span className="text-sm text-muted-foreground">(Qty {group.itemQty})</span>
          </div>

          {isMobile ? (
            <div className="space-y-2 ml-2">
              {group.rows.map((row: any) => (
                <Card key={row.id} className="border">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{row.material_name || 'Unknown'}</span>
                      {sourceLabel(row.source)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Qty: </span>
                        <span className="text-foreground">{row.quantity_used}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">Unit: </span>
                        <span className="text-foreground">{formatCurrency(row.unit_cost)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-foreground">{formatCurrency(row.total_cost)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Table className="mb-4">
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Material</TableHead>
                  <TableHead className="text-right text-muted-foreground">Qty Used</TableHead>
                  <TableHead className="text-right text-muted-foreground">Unit Cost</TableHead>
                  <TableHead className="text-right text-muted-foreground">Total Cost</TableHead>
                  <TableHead className="text-muted-foreground">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.rows.map((row: any) => (
                  <TableRow key={row.id} className="border-border">
                    <TableCell className="text-foreground">{row.material_name || 'Unknown'}</TableCell>
                    <TableCell className="text-right text-foreground">{row.quantity_used}</TableCell>
                    <TableCell className="text-right text-foreground">{formatCurrency(row.unit_cost)}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground">{formatCurrency(row.total_cost)}</TableCell>
                    <TableCell>{sourceLabel(row.source)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ))}

      {/* BOM Snapshot (Collapsible) */}
      {bomSnapshots.length > 0 && (
        <Collapsible open={snapshotOpen} onOpenChange={setSnapshotOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            {snapshotOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            View BOM Snapshot (Advanced)
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto text-foreground max-h-60 overflow-y-auto">
              {JSON.stringify(bomSnapshots.map(s => ({
                bom: s.bom_name,
                version: s.bom_version,
                snapshot: s.snapshot_json,
              })), null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
