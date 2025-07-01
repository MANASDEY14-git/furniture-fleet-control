
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone, MapPin, Package } from 'lucide-react';
import moment from 'moment';
import { formatCurrency } from '@/utils/currencyUtils';
import type { DeliveryEvent } from '@/types/erp';

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
  const getStatusBadge = (status: string) => {
    const variants = {
      overdue: 'destructive',
      today: 'default',
      upcoming: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status === 'overdue' ? 'Overdue' : status === 'today' ? 'Today' : 'Upcoming'}
      </Badge>
    );
  };

  return (
    <Dialog open={!!selectedEvent} onOpenChange={onClose}>
      <DialogContent className="futuristic-card max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-cyan-300">Delivery Details - {selectedEvent?.order_number}</DialogTitle>
        </DialogHeader>
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-blue-100">
                Order: {selectedEvent.order_number}
              </h3>
              {getStatusBadge(selectedEvent.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-200">
                  <span className="font-semibold">Customer:</span>
                  <span>{selectedEvent.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-200">
                  <Phone className="w-4 h-4" />
                  <span>{selectedEvent.customer_phone}</span>
                </div>
                <div className="flex items-start gap-2 text-blue-200">
                  <MapPin className="w-4 h-4 mt-1" />
                  <span>{selectedEvent.customer_address}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-200">
                  <Package className="w-4 h-4" />
                  <span>Store: {selectedEvent.store_name}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-blue-200">
                  <span className="font-semibold">Delivery Date:</span>
                  <span className="ml-2">{moment(selectedEvent.start).format('MMMM Do, YYYY')}</span>
                </div>
                <div className="text-blue-200">
                  <span className="font-semibold">Balance Due:</span>
                  <span className="ml-2 text-orange-400 font-bold">
                    {formatCurrency(selectedEvent.balance_due)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items */}
            {selectedEvent.items && selectedEvent.items.length > 0 && (
              <div className="border-t border-blue-500/30 pt-4">
                <h4 className="text-blue-200 font-semibold mb-2">Order Items</h4>
                <div className="overflow-x-auto">
                  <Table className="data-grid">
                    <TableHeader>
                      <TableRow className="border-blue-500/30">
                        <TableHead className="text-blue-200">Item</TableHead>
                        <TableHead className="text-blue-200">Quantity</TableHead>
                        <TableHead className="text-blue-200">Unit Price</TableHead>
                        <TableHead className="text-blue-200">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEvent.items.map((item: any) => (
                        <TableRow key={item.id} className="border-blue-500/20">
                          <TableCell className="text-blue-200">{item.item_name}</TableCell>
                          <TableCell className="text-blue-200">{item.quantity}</TableCell>
                          <TableCell className="text-blue-200">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-cyan-300 font-semibold">{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="border-t border-blue-500/30 pt-4">
              <h4 className="text-blue-200 font-semibold mb-2">Update Delivery Date</h4>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newDeliveryDate}
                  onChange={(e) => onDeliveryDateChange(e.target.value)}
                  className="neon-border bg-slate-800/50 text-blue-100"
                />
                <Button
                  onClick={onUpdateDeliveryDate}
                  disabled={isUpdating}
                  className="cyber-button text-white"
                >
                  {isUpdating ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
