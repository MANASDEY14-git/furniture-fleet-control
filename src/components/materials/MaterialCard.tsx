import { Package2, TrendingUp, DollarSign, Edit3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { formatCurrency } from '@/utils/currencyUtils';
import { Material } from '@/hooks/useMaterials';
import MaterialForm from '@/components/MaterialForm';
import MaterialStockMovementsDialog from '@/components/MaterialStockMovementsDialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface MaterialCardProps {
  material: Material;
}

export default function MaterialCard({ material }: MaterialCardProps) {
  const isMobile = useIsMobile();
  const totalValue = material.quantity_available * material.cost_price;

  const getStockStatus = () => {
    if (material.quantity_available <= 5) {
      return { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-400/30' };
    } else if (material.quantity_available <= 20) {
      return { label: 'Low Stock', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30' };
    }
    return { label: 'In Stock', color: 'bg-green-500/20 text-green-400 border-green-400/30' };
  };

  const stockStatus = getStockStatus();

  if (isMobile) {
    return (
      <Card className="futuristic-card hover:border-cyan-400/50 transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package2 className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-blue-100 truncate">{material.name}</h3>
            </div>
            <Badge className={stockStatus.color}>
              {stockStatus.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="space-y-1">
              <p className="text-xs text-blue-300">Stock</p>
              <p className="text-sm font-semibold text-cyan-300">
                {material.quantity_available} {material.unit || 'units'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-blue-300">Cost Price</p>
              <p className="text-sm font-semibold text-cyan-300">
                {formatCurrency(material.cost_price)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-blue-300">Total Value</p>
              <p className="text-sm font-semibold text-green-400">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-blue-300">Unit</p>
              <p className="text-sm text-blue-200">{material.unit || 'N/A'}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <MaterialForm
              material={material}
              trigger={
                <Button size="sm" variant="outline" className="flex-1 neon-border text-blue-100 hover:bg-blue-800/30">
                  <Edit3 className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              }
            />
            <MaterialStockMovementsDialog
              material={material}
              trigger={
                <Button size="sm" variant="outline" className="flex-1 neon-border text-blue-100 hover:bg-blue-800/30">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  History
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Desktop layout remains as table row - this will be handled in the table component
  return null;
}