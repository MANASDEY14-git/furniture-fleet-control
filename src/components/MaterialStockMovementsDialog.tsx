import { useState } from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useMaterialStockMovements } from '@/hooks/useMaterialStockMovements';
import { Material } from '@/hooks/useMaterials';

interface MaterialStockMovementsDialogProps {
  material: Material;
  trigger: React.ReactNode;
}

export default function MaterialStockMovementsDialog({ material, trigger }: MaterialStockMovementsDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: movements = [], isLoading } = useMaterialStockMovements(material.id);

  const getMovementIcon = (movementType: string, quantityChange: number) => {
    if (quantityChange > 0) {
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    } else {
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    }
  };

  const getMovementBadge = (movementType: string, quantityChange: number) => {
    if (quantityChange > 0) {
      return (
        <Badge variant="outline" className="border-green-400 text-green-400 bg-green-400/10">
          {movementType.toUpperCase()}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="border-red-400 text-red-400 bg-red-400/10">
          {movementType.toUpperCase()}
        </Badge>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl futuristic-card">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Stock Movements - {material.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="mb-4 p-4 neon-border bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-blue-200 text-sm">Current Stock</p>
                <p className="text-cyan-300 text-lg font-semibold">
                  {material.quantity_available} {material.unit || 'units'}
                </p>
              </div>
              <div>
                <p className="text-blue-200 text-sm">Cost Price</p>
                <p className="text-cyan-300 text-lg font-semibold">₹{material.cost_price}</p>
              </div>
              <div>
                <p className="text-blue-200 text-sm">Total Value</p>
                <p className="text-green-400 text-lg font-semibold">
                  ₹{(material.quantity_available * material.cost_price).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-blue-200 text-sm">Total Movements</p>
                <p className="text-cyan-300 text-lg font-semibold">{movements.length}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Date</TableHead>
                  <TableHead className="text-blue-200">Type</TableHead>
                  <TableHead className="text-blue-200">Quantity Change</TableHead>
                  <TableHead className="text-blue-200">Reference</TableHead>
                  <TableHead className="text-blue-200">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-blue-300">
                      Loading movements...
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-blue-300">
                      No stock movements found
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id} className="border-blue-500/20 hover:bg-blue-900/20">
                      <TableCell className="text-blue-200">
                        {new Date(movement.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movement_type, movement.quantity_change)}
                          {getMovementBadge(movement.movement_type, movement.quantity_change)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={movement.quantity_change > 0 ? 'text-green-400' : 'text-red-400'}>
                          {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change} {material.unit || 'units'}
                        </span>
                      </TableCell>
                      <TableCell className="text-blue-200">
                        {movement.reference_type ? (
                          <Badge variant="outline" className="border-blue-400 text-blue-400 bg-blue-400/10">
                            {movement.reference_type}
                          </Badge>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell className="text-blue-200 max-w-xs truncate">
                        {movement.notes || 'No notes'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}