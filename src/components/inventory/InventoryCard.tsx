import { useState } from 'react';
import { Package2, Store, Tag, Calendar, Edit3, Trash2, MoreVertical, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSwipeable } from 'react-swipeable';
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
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showActions, setShowActions] = useState(false);

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

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (isMobile) {
        setShowActions(true);
        setSwipeOffset(-80);
      }
    },
    onSwipedRight: () => {
      if (isMobile) {
        setShowActions(false);
        setSwipeOffset(0);
      }
    },
    onSwiping: (eventData) => {
      if (isMobile && eventData.deltaX < 0) {
        const offset = Math.max(-80, eventData.deltaX);
        setSwipeOffset(offset);
      }
    },
    preventScrollOnSwipe: true,
    trackMouse: false
  });

  if (!isMobile) return null;

  return (
    <div className="relative overflow-hidden">
      <Card 
        className={`mb-3 simple-card transition-transform duration-200 ${
          showActions ? 'transform translate-x-[-80px]' : ''
        }`} 
        style={{ transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined }}
        {...swipeHandlers}
      >
        <CardContent className="p-4 mobile-card-spacing">
          <div className="flex items-start gap-3 mb-4">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(item.id, !!checked)}
              className="mt-1 mobile-touch-target"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-foreground mobile-text-base leading-tight truncate pr-2">
                  {item.name}
                </h3>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <Badge variant={stockStatus.variant} className="text-sm px-3 py-1">
                  {stockStatus.label}
                </Badge>
                <span className="text-base text-muted-foreground font-medium">
                  {item.quantity_available} units
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-base">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Package2 className="w-5 h-5 flex-shrink-0" />
                <span className="font-semibold text-foreground">
                  {formatCurrency(item.selling_price)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Store className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{storeName || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Tag className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{categoryName || 'N/A'}</span>
              </div>
              {stockAge > 0 && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
                  <span className={`text-sm ${stockAgeStatus.color} font-medium`}>
                    {stockAgeStatus.status} ({stockAge}d)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick action hint */}
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Swipe left for quick actions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Swipe actions panel */}
      <div className={`absolute top-0 right-0 h-full w-20 bg-muted/50 flex flex-col transition-opacity duration-200 ${
        showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <ItemForm
          item={item}
          trigger={
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 flex flex-col items-center justify-center p-2 mobile-touch-target text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
            >
              <Edit3 className="w-5 h-5 mb-1" />
              <span className="text-xs">Edit</span>
            </Button>
          }
        />
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 flex flex-col items-center justify-center p-2 mobile-touch-target text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 className="w-5 h-5 mb-1" />
              <span className="text-xs">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="mx-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{item.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="mobile-touch-target">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDeleteItem(item.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 mobile-touch-target"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}