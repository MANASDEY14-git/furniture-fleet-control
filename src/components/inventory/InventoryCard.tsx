import { Package2, Store, Tag, Calendar, Edit3, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
    if (days <= 30) return { status: "Fresh Stock", color: "text-green-600" };
    if (days <= 90) return { status: "Good Stock", color: "text-blue-600" };
    if (days <= 180) return { status: "Aging Stock", color: "text-yellow-600" };
    return { status: "Old Stock", color: "text-red-600" };
  };

  const getStockStatus = () => {
    if (item.quantity_available <= 5) {
      return { label: 'Critical', variant: 'destructive' as const };
    } else if (item.quantity_available <= 10) {
      return { label: 'Low Stock', variant: 'secondary' as const };
    }
    return { label: 'In Stock', variant: 'default' as const };
  };

  const stockAge = calculateStockAge(item.stock_receive_date);
  const stockAgeStatus = getStockAgeStatus(stockAge);
  const stockStatus = getStockStatus();

  if (!isMobile) return null;

  return (
    <Card className="mb-3 simple-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectionChange(item.id, !!checked)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-foreground text-base leading-tight truncate pr-2">{item.name}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <ItemForm
                    item={item}
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Item</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{item.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteItem(item.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={stockStatus.variant} className="text-xs">
                {stockStatus.label}
              </Badge>
              <span className="text-sm text-muted-foreground">{item.quantity_available} units</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{formatCurrency(item.selling_price)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Store className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{storeName || 'N/A'}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Tag className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{categoryName || 'N/A'}</span>
            </div>
            {stockAge > 0 && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span className={`text-sm ${stockAgeStatus.color} font-medium`}>
                  {stockAgeStatus.status} ({stockAge}d)
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}