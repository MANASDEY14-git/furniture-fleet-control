import { useState } from 'react';
import { Eye, Calendar, Package, FileText, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaterialStockMovement } from '@/hooks/useMaterialStockMovements';
interface MaterialStockMovementDetailsDialogProps {
  movement: MaterialStockMovement;
}
export default function MaterialStockMovementDetailsDialog({
  movement
}: MaterialStockMovementDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const getMovementTypeColor = (quantityChange: number) => {
    return quantityChange > 0 ? 'text-green-400' : 'text-red-400';
  };
  const getMovementIcon = (quantityChange: number) => {
    return quantityChange > 0 ? '📈' : '📉';
  };
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-900/20">
          <Eye className="h-4 w-4 text-blue-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-900 border-blue-500/30">
        <DialogHeader>
          <DialogTitle className="text-cyan-300 glow-text flex items-center gap-2">
            <Package className="w-5 h-5" />
            Material Stock Movement Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Overview Card */}
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300 text-lg flex items-center gap-2">
                <Info className="w-5 h-5" />
                Movement Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-200 text-sm">Material</p>
                  <p className="font-semibold text-slate-950">{movement.materials.name}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Unit</p>
                  <p className="text-slate-950">{movement.materials.unit || 'units'}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Movement Type</p>
                  <Badge variant="outline" className={`${movement.quantity_change > 0 ? 'border-green-400 text-green-400 bg-green-400/10' : 'border-red-400 text-red-400 bg-red-400/10'}`}>
                    {getMovementIcon(movement.quantity_change)} {movement.movement_type.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Quantity Change</p>
                  <p className={`font-bold text-lg ${getMovementTypeColor(movement.quantity_change)}`}>
                    {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change} {movement.materials.unit || 'units'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date & Reference Card */}
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300 text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Date & Reference Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-200 text-sm">Date & Time</p>
                  <p className="text-slate-950">{new Date(movement.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Reference Type</p>
                  {movement.reference_type ? <Badge variant="outline" className="border-blue-400 text-blue-400 bg-blue-400/10">
                      {movement.reference_type}
                    </Badge> : <p className="text-blue-300">N/A</p>}
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Reference ID</p>
                  <p className="font-mono text-sm text-slate-950">
                    {movement.reference_id ? movement.reference_id.slice(0, 8) + '...' : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-blue-200 text-sm">Movement ID</p>
                  <p className="font-mono text-sm text-slate-950">{movement.id.slice(0, 8)}...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="futuristic-card">
            <CardHeader>
              <CardTitle className="text-cyan-300 text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Movement Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-blue-500/20">
                <p className="text-blue-100 leading-relaxed">
                  {movement.notes || 'No additional notes available for this movement.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="neon-border bg-slate-800/50 text-blue-100 hover:bg-blue-900/20">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}