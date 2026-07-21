import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Phone, 
  MapPin, 
  Package, 
  CheckCircle, 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  X
} from 'lucide-react';
import moment from 'moment';
import { formatCurrency } from '@/utils/currencyUtils';
import { cn } from '@/lib/utils';
import type { DeliveryEvent } from '@/types/erp';
import { useUpdateDeliveryStatus, useUpdateDeliveryDate } from '@/hooks/useSalePaymentStatus';

interface DeliveryDetailPanelProps {
  delivery: DeliveryEvent | null;
  onClose?: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  isMobile?: boolean;
}

export default function DeliveryDetailPanel({
  delivery,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
  isMobile = false,
}: DeliveryDetailPanelProps) {
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  
  const updateDeliveryStatus = useUpdateDeliveryStatus();
  const updateDeliveryDate = useUpdateDeliveryDate();


  const handleMarkDelivered = () => {
    if (delivery) {
      updateDeliveryStatus.mutate({ saleId: delivery.id });
    }
  };

  const handleUpdateDate = () => {
    if (delivery && newDeliveryDate) {
      updateDeliveryDate.mutateAsync({
        saleId: delivery.id,
        deliveryDate: newDeliveryDate,
      });
    }
  };

  const statusColors = {
    overdue: 'bg-red-500',
    today: 'bg-yellow-500',
    upcoming: 'bg-green-500',
    delivered: 'bg-blue-500',
  };

  const statusLabels = {
    overdue: 'Overdue',
    today: 'Today',
    upcoming: 'Upcoming',
    delivered: 'Delivered',
  };

  const statusBadgeVariants = {
    overdue: 'destructive' as const,
    today: 'default' as const,
    upcoming: 'secondary' as const,
    delivered: 'outline' as const,
  };

  if (!delivery) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Select a delivery to view details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sticky Header */}
      <div className={cn(
        "sticky top-0 z-10 bg-background border-b border-border",
        "px-4 py-3"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg text-foreground truncate">
                {delivery.customer_name}
              </h2>
              <Badge variant={statusBadgeVariants[delivery.status]} className="shrink-0 gap-1">
                {statusLabels[delivery.status]}
                {delivery.status === 'delivered' && <CheckCircle className="w-3 h-3" />}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{delivery.order_number}</p>
          </div>
          
          {/* Navigation + Close */}
          <div className="flex items-center gap-1">
            {onNavigate && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNavigate('prev')}
                  disabled={!hasPrev}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNavigate('next')}
                  disabled={!hasNext}
                  className="h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Balance Card - Most prominent */}
          <Card className="border-2 border-primary/20">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Balance Due</p>
                <p className={cn(
                  "text-3xl font-bold",
                  delivery.balance_due > 0 ? "text-destructive" : "text-primary"
                )}>
                  {formatCurrency(delivery.balance_due)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Primary Action - Show for all non-delivered orders */}
          {!delivery.is_delivered && delivery.status !== 'delivered' && (
            <Button
              onClick={handleMarkDelivered}
              disabled={updateDeliveryStatus.isPending}
              className="w-full h-12 text-base bg-primary text-primary-foreground"
            >
              {updateDeliveryStatus.isPending ? (
                'Marking as Delivered...'
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Mark as Delivered
                </>
              )}
            </Button>
          )}

          {/* Customer Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-foreground">Customer Details</h3>
              
              <a 
                href={`tel:${delivery.customer_phone}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Phone className="w-5 h-5 text-primary" />
                <span className="font-medium">{delivery.customer_phone}</span>
              </a>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <span className="text-sm">{delivery.customer_address || 'No address provided'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-foreground">Delivery Info</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Delivery Date</p>
                  <p className="font-medium">{moment(delivery.start).format('MMM D, YYYY')}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Store</p>
                  <p className="font-medium truncate">{delivery.store_name}</p>
                </div>
              </div>

              {delivery.delivered_at && (
                <div className="p-3 rounded-lg bg-primary/10">
                  <p className="text-xs text-muted-foreground mb-1">Delivered At</p>
                  <p className="font-medium text-primary">
                    {moment(delivery.delivered_at).format('MMM D, YYYY h:mm A')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Collapsible open={itemsExpanded} onOpenChange={setItemsExpanded}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground">
                        Order Items ({delivery.items?.length || 0})
                      </h3>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      itemsExpanded && "rotate-180"
                    )} />
                  </div>
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  {delivery.items && delivery.items.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Item</TableHead>
                            <TableHead className="text-xs text-right">Qty</TableHead>
                            <TableHead className="text-xs text-right">Price</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {delivery.items.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm font-medium">{item.item_name}</TableCell>
                              <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                              <TableCell className="text-sm text-right">{formatCurrency(item.unit_price)}</TableCell>
                              <TableCell className="text-sm text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No items</p>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Reschedule Section */}
          {!delivery.is_delivered && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">Reschedule Delivery</h3>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newDeliveryDate}
                    onChange={(e) => setNewDeliveryDate(e.target.value)}
                    className="flex-1"
                    min={moment().format('YYYY-MM-DD')}
                  />
                  <Button
                    onClick={handleUpdateDate}
                    disabled={!newDeliveryDate || updateDeliveryDate.isPending}
                    variant="outline"
                  >
                    {updateDeliveryDate.isPending ? 'Saving...' : 'Update'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
