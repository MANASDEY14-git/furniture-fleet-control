import React from 'react';
import { TrendingUp, TrendingDown, RefreshCw, RotateCcw, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Material } from '@/hooks/useMaterials';
import { useMaterialStockMovements } from '@/hooks/useMaterialStockMovements';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface MaterialMovementsTabProps {
  material: Material;
}

const movementConfig: Record<string, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
  purchase: { 
    label: 'Purchase', 
    color: 'text-green-600', 
    icon: <TrendingUp className="w-3 h-3" />,
    bgColor: 'bg-green-500/10'
  },
  consumption: { 
    label: 'Consumption', 
    color: 'text-red-600', 
    icon: <TrendingDown className="w-3 h-3" />,
    bgColor: 'bg-red-500/10'
  },
  sale: { 
    label: 'Sale/Production', 
    color: 'text-red-600', 
    icon: <TrendingDown className="w-3 h-3" />,
    bgColor: 'bg-red-500/10'
  },
  adjustment: { 
    label: 'Adjustment', 
    color: 'text-yellow-600', 
    icon: <RefreshCw className="w-3 h-3" />,
    bgColor: 'bg-yellow-500/10'
  },
  return: { 
    label: 'Return', 
    color: 'text-blue-600', 
    icon: <RotateCcw className="w-3 h-3" />,
    bgColor: 'bg-blue-500/10'
  },
  cancellation: { 
    label: 'Cancelled Order', 
    color: 'text-purple-600', 
    icon: <RotateCcw className="w-3 h-3" />,
    bgColor: 'bg-purple-500/10'
  },
};

export default function MaterialMovementsTab({ material }: MaterialMovementsTabProps) {
  const { data: movements = [], isLoading } = useMaterialStockMovements(material.id);

  // Calculate running balance
  const movementsWithBalance = React.useMemo(() => {
    // Sort oldest first for balance calculation
    const sorted = [...movements].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let balance = 0;
    const withBalance = sorted.map(m => {
      balance += m.quantity_change;
      return { ...m, balance };
    });
    
    // Reverse to show newest first
    return withBalance.reverse();
  }, [movements]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          {movements.length} movement{movements.length !== 1 ? 's' : ''} recorded
        </p>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading movements...</p>
          </div>
        ) : movements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Activity className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No movements recorded</p>
            <p className="text-sm text-muted-foreground">Stock changes will appear here</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
                <TableHead className="text-xs text-right">Change</TableHead>
                <TableHead className="text-xs text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movementsWithBalance.map((movement) => {
                const config = movementConfig[movement.movement_type] || {
                  label: movement.movement_type,
                  color: 'text-muted-foreground',
                  icon: <Activity className="w-3 h-3" />,
                  bgColor: 'bg-muted'
                };
                const isPositive = movement.quantity_change > 0;

                return (
                  <TableRow key={movement.id} className="text-sm">
                    <TableCell className="py-2">
                      {format(new Date(movement.created_at), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className={cn("gap-1", config.bgColor, config.color)}>
                        {config.icon}
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 max-w-[200px] truncate text-muted-foreground">
                      {movement.notes || '-'}
                    </TableCell>
                    <TableCell className={cn(
                      "py-2 text-right font-semibold",
                      isPositive ? "text-green-600" : "text-red-600"
                    )}>
                      {isPositive ? '+' : ''}{movement.quantity_change}
                    </TableCell>
                    <TableCell className="py-2 text-right font-medium">
                      {movement.balance}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </div>
  );
}
