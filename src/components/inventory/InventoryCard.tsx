import React, { useState, useCallback } from 'react';
import { Edit, Trash2, AlertTriangle, ShoppingCart, Package, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useSwipeable } from 'react-swipeable';
import { MobileConfirmationDialog } from '@/components/ui/mobile-confirmation-dialog';
import ItemForm from '@/components/ItemForm';
import { formatCurrency } from '@/utils/currencyUtils';
import { cn } from '@/lib/utils';
import type { Item } from '@/hooks/useItems';

interface InventoryCardProps {
  item: Item;
  isSelected: boolean;
  onSelectionChange: (itemId: string, checked: boolean) => void;
  onDeleteItem: (id: string) => void;
  storeName: string;
  categoryName: string;
}

const calculateStockAge = (stockReceiveDate?: string): number => {
  if (!stockReceiveDate) return 0;
  const receiveDate = new Date(stockReceiveDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - receiveDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getStockAgeStatus = (days: number): { status: string, color: string } => {
  if (days <= 30) return { status: "Fresh Stock", color: "text-green-500" };
  if (days <= 90) return { status: "Good Stock", color: "text-blue-500" };
  if (days <= 180) return { status: "Aging Stock", color: "text-yellow-500" };
  return { status: "Old Stock", color: "text-red-500" };
};

export default function InventoryCard({
  item,
  isSelected,
  onSelectionChange,
  onDeleteItem,
  storeName,
  categoryName
}: InventoryCardProps) {
  const [showSwipeActions, setShowSwipeActions] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Haptic feedback helper
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      setSwipeDirection('left');
      setShowSwipeActions(true);
      hapticFeedback('light');
    },
    onSwipedRight: () => {
      setSwipeDirection('right');
      setShowSwipeActions(true);
      hapticFeedback('light');
    },
    onTap: () => {
      if (showSwipeActions) {
        setShowSwipeActions(false);
        setSwipeDirection(null);
      }
    },
    trackMouse: false,
    preventScrollOnSwipe: true,
    delta: 50
  });

  const handleDelete = useCallback(() => {
    hapticFeedback('heavy');
    onDeleteItem(item.id);
  }, [item.id, onDeleteItem, hapticFeedback]);

  const handleEdit = useCallback(() => {
    hapticFeedback('medium');
  }, [hapticFeedback]);

  const isLowStock = item.quantity_available < 5;
  const stockAge = calculateStockAge(item.stock_receive_date);
  const stockAgeStatus = getStockAgeStatus(stockAge);

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card transition-all duration-200 animate-fade-in">
      {/* Swipe action backgrounds */}
      {showSwipeActions && (
        <>
          <div className={cn(
            "absolute inset-y-0 right-0 w-20 flex items-center justify-center transition-all duration-200",
            "bg-destructive/10 border-l border-destructive/20",
            swipeDirection === 'left' ? "translate-x-0" : "translate-x-full"
          )}>
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div className={cn(
            "absolute inset-y-0 left-0 w-20 flex items-center justify-center transition-all duration-200",
            "bg-primary/10 border-r border-primary/20",
            swipeDirection === 'right' ? "translate-x-0" : "-translate-x-full"
          )}>
            <Edit className="w-5 h-5 text-primary" />
          </div>
        </>
      )}

      {/* Main card content */}
      <div 
        {...swipeHandlers}
        className={cn(
          "relative bg-card p-4 transition-transform duration-200 touch-manipulation",
          showSwipeActions && swipeDirection === 'left' && "-translate-x-20",
          showSwipeActions && swipeDirection === 'right' && "translate-x-20"
        )}
      >
        {/* Header with selection and title */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                hapticFeedback('light');
                onSelectionChange(item.id, checked as boolean);
              }}
              className="touch-target"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-base leading-tight mb-1 truncate" title={item.name}>
                {item.name}
              </h3>
              <p className="text-sm text-muted-foreground">{categoryName}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Badge 
              variant={isLowStock ? "destructive" : "secondary"}
              className="text-xs font-medium self-start"
            >
              {isLowStock ? 'Low Stock' : 'In Stock'}
            </Badge>
            {isLowStock && (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            )}
          </div>
        </div>

        {/* Info grid with better spacing */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Package className="w-3 h-3" />
              <span>Quantity</span>
            </div>
            <p className={cn(
              "text-sm font-semibold",
              isLowStock ? "text-destructive" : "text-foreground"
            )}>
              {item.quantity_available}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShoppingCart className="w-3 h-3" />
              <span>Price</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrency(item.selling_price)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Store</span>
            </div>
            <p className="text-sm font-medium text-foreground truncate" title={storeName}>
              {storeName}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Stock Age</span>
            </div>
            <p className={cn(
              "text-sm font-medium",
              stockAgeStatus.color
            )}>
              {stockAge} days
            </p>
          </div>
        </div>

        {/* Action buttons with better touch targets */}
        <div className="flex gap-3">
          <ItemForm
            item={item}
            trigger={
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-10 text-sm touch-target"
                onClick={handleEdit}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            }
          />

          <MobileConfirmationDialog
            trigger={
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 w-10 p-0 text-destructive hover:text-destructive touch-target"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            }
            title="Delete Item"
            description={`Are you sure you want to delete "${item.name}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="destructive"
            onConfirm={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}