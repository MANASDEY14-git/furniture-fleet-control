
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone, MapPin, Package, CheckCircle } from 'lucide-react';
import moment from 'moment';
import { formatCurrency } from '@/utils/currencyUtils';
import type { DeliveryEvent } from '@/types/erp';
import { useUpdateDeliveryStatus } from '@/hooks/useSalePaymentStatus';
import { useMemo } from 'react';

interface EventDetailsDialogProps {
  selectedEvent: DeliveryEvent | null;
  onClose: () => void;
  newDeliveryDate: string;
  onDeliveryDateChange: (date: string) => void;
  onUpdateDeliveryDate: () => void;
  isUpdating: boolean;
}

export default function EventDetailsDialog({
  selectedEvent,
  onClose,
  newDeliveryDate,
  onDeliveryDateChange,
  onUpdateDeliveryDate,
  isUpdating,
}: EventDetailsDialogProps) {
  const updateDeliveryStatus = useUpdateDeliveryStatus();
  const isDeliveryToday = useMemo(() => {
    if (!selectedEvent) return false;
    const today = new Date();
    const deliveryDate = new Date(selectedEvent.start);
    return (
      deliveryDate.getDate() === today.getDate() &&
      deliveryDate.getMonth() === today.getMonth() &&
      deliveryDate.getFullYear() === today.getFullYear()
    );
  }, [selectedEvent]);

  const getStatusBadge = (status: string) => {
    const variants = {
      overdue: 'destructive',
      today: 'default',
      upcoming: 'secondary',
      delivered: 'outline',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="gap-1">
        {status === 'overdue' ? 'Overdue' : 
         status === 'today' ? 'Today' : 
         status === 'delivered' ? 'Delivered' : 'Upcoming'}
        {status === 'delivered' && <CheckCircle className="w-3 h-3" />}
      </Badge>
    );
  };

  return (
    <Dialog open={!!selectedEvent} onOpenChange={onClose}>
      <DialogContent className="simple-card max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Delivery Details - {selectedEvent?.order_number}</DialogTitle>
        </DialogHeader>
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-foreground">
                Order: {selectedEvent.order_number}
              </h3>
              {getStatusBadge(selectedEvent.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground">
                  <span className="font-semibold">Customer:</span>
                  <span>{selectedEvent.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{selectedEvent.customer_phone}</span>
                </div>
                <div className="flex items-start gap-2 text-foreground">
                  <MapPin className="w-4 h-4 mt-1" />
                  <span>{selectedEvent.customer_address}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Package className="w-4 h-4" />
                  <span>Store: {selectedEvent.store_name}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-foreground">
                  <span className="font-semibold">Delivery Date:</span>
                  <span className="ml-2">{moment(selectedEvent.start).format('MMMM Do, YYYY')}</span>
                </div>
                <div className="text-foreground">
                  <span className="font-semibold">Balance Due:</span>
                  <span className="ml-2 text-foreground font-bold">
                    {formatCurrency(selectedEvent.balance_due)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items */}
            {selectedEvent.items && selectedEvent.items.length > 0 ? (
              <div className="border-t border-border pt-4">
                <h4 className="text-foreground font-semibold mb-2">Order Items</h4>
                <div className="overflow-x-auto">
                  <Table className="data-grid">
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">Item</TableHead>
                        <TableHead className="text-muted-foreground">Quantity</TableHead>
                        <TableHead className="text-muted-foreground">Unit Price</TableHead>
                        <TableHead className="text-muted-foreground">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEvent.items.map((item: any) => (
                        <TableRow key={item.id} className="border-border">
                          <TableCell className="text-foreground">{item.item_name}</TableCell>
                          <TableCell className="text-foreground">{item.quantity}</TableCell>
                          <TableCell className="text-foreground">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-foreground font-semibold">{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="border-t border-border pt-4">
                <h4 className="text-foreground font-semibold mb-2">Order Items</h4>
                <p className="text-muted-foreground">No order items found</p>
              </div>
            )}

            {!selectedEvent.is_delivered && (
              <div className="border-t border-border pt-4 space-y-4">
                <div>
                  <h4 className="text-foreground font-semibold mb-2">Update Delivery Date</h4>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={newDeliveryDate}
                      onChange={(e) => onDeliveryDateChange(e.target.value)}
                      className="border-border bg-background text-foreground"
                    />
                    <Button
                      onClick={onUpdateDeliveryDate}
                      disabled={isUpdating}
                      className="bg-primary text-primary-foreground hover:bg-primary/80"
                    >
                      {isUpdating ? 'Updating...' : 'Update'}
                    </Button>
                  </div>
                </div>

                {isDeliveryToday && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => updateDeliveryStatus.mutate({ saleId: selectedEvent.id })}
                      disabled={updateDeliveryStatus.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {updateDeliveryStatus.isPending ? (
                        'Marking as Delivered...'
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Delivered
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
