import { useState, useEffect } from 'react';
import { Activity, Package2, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useMaterialStockMovements } from '@/hooks/useMaterialStockMovements';
import { useMaterials } from '@/hooks/useMaterials';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MaterialStockMovementDetailsDialog from '@/components/MaterialStockMovementDetailsDialog';

export default function MaterialStockLedgerPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');

  const { data: materials = [] } = useMaterials();
  const { data: movements = [], isLoading } = useMaterialStockMovements(selectedMaterial === 'all' ? undefined : selectedMaterial);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('material-stock-movements-listen')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'material_stock_movements' }, () => {
        queryClient.invalidateQueries({ queryKey: ['material-stock-movements'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.materials.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (movement.notes && movement.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const type = movement.movement_type?.toLowerCase();
    const ref = movement.reference_type?.toLowerCase();
    const matchesType =
      movementTypeFilter === 'all' ||
      (movementTypeFilter === 'sale' && type === 'sale') ||
      (movementTypeFilter === 'IN' && movement.quantity_change > 0) ||
      (movementTypeFilter === 'purchase' && type === 'in' && ref === 'purchase');
    return matchesSearch && matchesType;
  });

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

  // Calculate totals
  const totalIn = filteredMovements
    .filter(m => m.quantity_change > 0)
    .reduce((sum, m) => sum + m.quantity_change, 0);
  
  const totalOut = filteredMovements
    .filter(m => m.quantity_change < 0)
    .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-300 glow-text">Material Stock Ledger</h1>
          <p className="text-blue-200">Track all material stock movements and transactions</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="futuristic-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-blue-200 text-sm">Total Stock In</p>
                <p className="text-green-400 text-lg font-semibold">{totalIn.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-blue-200 text-sm">Total Stock Out</p>
                <p className="text-red-400 text-lg font-semibold">{totalOut.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-blue-200 text-sm">Total Movements</p>
                <p className="text-cyan-400 text-lg font-semibold">{filteredMovements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="futuristic-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package2 className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-blue-200 text-sm">Net Movement</p>
                <p className={`text-lg font-semibold ${(totalIn - totalOut) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(totalIn - totalOut) >= 0 ? '+' : ''}{(totalIn - totalOut).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="futuristic-card">
        <CardHeader>
          <CardTitle className="text-cyan-300 glow-text flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Stock Movement History
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <Input
              placeholder="Search movements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neon-border bg-slate-800/50 text-blue-100 placeholder-blue-400"
            />
            
            <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                <SelectValue placeholder="Filter by material" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/30">
                <SelectItem value="all" className="text-blue-100 focus:bg-blue-800/30">
                  All Materials
                </SelectItem>
                {materials.map((material) => (
                  <SelectItem key={material.id} value={material.id} className="text-blue-100 focus:bg-blue-800/30">
                    {material.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
              <SelectTrigger className="neon-border bg-slate-800/50 text-blue-100">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-blue-500/30">
                <SelectItem value="all" className="text-blue-100 focus:bg-blue-800/30">
                  All Types
                </SelectItem>
                <SelectItem value="IN" className="text-blue-100 focus:bg-blue-800/30">
                  Stock In
                </SelectItem>
                <SelectItem value="sale" className="text-blue-100 focus:bg-blue-800/30">
                  Sale/Usage
                </SelectItem>
                <SelectItem value="purchase" className="text-blue-100 focus:bg-blue-800/30">
                  Purchase
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-blue-500/30">
                  <TableHead className="text-blue-200">Date</TableHead>
                  <TableHead className="text-blue-200">Material</TableHead>
                  <TableHead className="text-blue-200">Type</TableHead>
                  <TableHead className="text-blue-200">Quantity Change</TableHead>
                  <TableHead className="text-blue-200">Reference</TableHead>
                  <TableHead className="text-blue-200">Notes</TableHead>
                  <TableHead className="text-blue-200">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-blue-300">
                      Loading movements...
                    </TableCell>
                  </TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-blue-300">
                      No stock movements found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => (
                    <TableRow key={movement.id} className="border-blue-500/20 hover:bg-blue-900/20">
                      <TableCell className="text-blue-200">
                        {new Date(movement.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-medium text-blue-100">
                        {movement.materials.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movement_type, movement.quantity_change)}
                          {getMovementBadge(movement.movement_type, movement.quantity_change)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={movement.quantity_change > 0 ? 'text-green-400' : 'text-red-400'}>
                          {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change} {movement.materials.unit || 'units'}
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
                      <TableCell>
                        <MaterialStockMovementDetailsDialog movement={movement} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}