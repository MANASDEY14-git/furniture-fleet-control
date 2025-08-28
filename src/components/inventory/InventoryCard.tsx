import { Package2, Store, Tag, Calendar, Edit3, Trash2, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/utils/currencyUtils';
import { Item } from '@/hooks/useItems';
import ItemForm from '@/components/ItemForm';
import { useIsMobile } from '@/hooks/use-mobile';

interface InventoryCardProps {
  item: Item;
  isSelected: boolean;
  onSelectionChange: (itemId: string, checked: boolean) => void;
  onDeleteItem: (id: string) => void;
  storeName?: string;
  categoryName?: string;
}

export default function InventoryCard({ 
  item, 
  isSelected, 
  onSelectionChange, 
  onDeleteItem, 
  storeName, 
  categoryName 
}: InventoryCardProps) {
  const isMobile = useIsMobile();

  const calculateStockAge = (stockReceiveDate?: string): number => {
    if (!stockReceiveDate) return 0;
    const receiveDate = new Date(stockReceiveDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - receiveDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStockAgeStatus = (days: number): { status: string, color: string } => {
    if (days <= 30) return { status: "Fresh Stock", color: "bg-green-500/20 text-green-400 border-green-400/30" };
    if (days <= 90) return { status: "Good Stock", color: "bg-blue-500/20 text-blue-400 border-blue-400/30" };
    if (days <= 180) return { status: "Aging Stock", color: "bg-yellow-500/20 text-yellow-400 border-yellow-400/30" };
    return { status: "Old Stock", color: "bg-red-500/20 text-red-400 border-red-400/30" };
  };

  const getStockStatus = () => {
    if (item.quantity_available <= 5) {
      return { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-400/30' };
    } else if (item.quantity_available <= 10) {
      return { label: 'Low Stock', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30' };
    }
    return { label: 'In Stock', color: 'bg-green-500/20 text-green-400 border-green-400/30' };
  };

  const stockAge = calculateStockAge(item.stock_receive_date);
  const stockAgeStatus = getStockAgeStatus(stockAge);
  const stockStatus = getStockStatus();

  if (!isMobile) return null;

  return (
    <Card className="futuristic-card hover:border-cyan-400/50 transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(item.id, !!checked)}
              className="border-cyan-400 data-[state=checked]:bg-cyan-400"
            />
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Package2 className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-blue-100 truncate">{item.name}</h3>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Badge className={stockStatus.color} variant="outline">
              {stockStatus.label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1">
            <p className="text-xs text-blue-300 flex items-center gap-1">
              <Package2 className="w-3 h-3" />
              Stock
            </p>
            <p className="text-sm font-semibold text-cyan-300">
              {item.quantity_available} units
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-blue-300">Sale Price</p>
            <p className="text-sm font-semibold text-cyan-300">
              {formatCurrency(item.selling_price)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-blue-300 flex items-center gap-1">
              <Store className="w-3 h-3" />
              Store
            </p>
            <p className="text-sm text-blue-200 truncate">{storeName || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-blue-300 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Category
            </p>
            <p className="text-sm text-blue-200 truncate">{categoryName || 'N/A'}</p>
          </div>
        </div>

        {stockAge > 0 && (
          <div className="mb-3">
            <Badge className={stockAgeStatus.color} variant="outline">
              <Calendar className="w-3 h-3 mr-1" />
              {stockAgeStatus.status} ({stockAge}d)
            </Badge>
          </div>
        )}

        <div className="flex gap-2">
          <ItemForm
            item={item}
            trigger={
              <Button size="sm" variant="outline" className="flex-1 neon-border text-blue-100 hover:bg-blue-800/30">
                <Edit3 className="w-3 h-3 mr-1" />
                Edit
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="neon-border text-red-400 hover:bg-red-800/30 hover:border-red-400">
                <Trash2 className="w-3 h-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="futuristic-card">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-cyan-300">Delete Item</AlertDialogTitle>
                <AlertDialogDescription className="text-blue-200">
                  Are you sure you want to delete "{item.name}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button variant="outline" className="neon-border text-blue-100">Cancel</Button>
                <Button 
                  onClick={() => onDeleteItem(item.id)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}