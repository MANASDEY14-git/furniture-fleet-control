import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Package, Store, Truck, Receipt, IndianRupee } from "lucide-react";
import { formatCurrency } from "@/utils/currencyUtils";
import { format } from "date-fns";

interface PurchaseDetailsDialogProps {
  purchase: any;
  storeName: string;
  supplierName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PurchaseDetailsDialog({
  purchase,
  storeName,
  supplierName,
  open,
  onOpenChange,
}: PurchaseDetailsDialogProps) {
  if (!purchase) return null;

  const items = purchase.items ? JSON.parse(JSON.stringify(purchase.items)) : null;
  const isMultiItem = items && Array.isArray(items) && items.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Purchase Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invoice Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(purchase.date), "PPP")}
            </div>
            {purchase.invoice_number && (
              <Badge variant="outline">#{purchase.invoice_number}</Badge>
            )}
          </div>

          <Separator />

          {/* Items Section */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              {isMultiItem ? `Items (${items.length})` : "Item"}
            </h4>

            {isMultiItem ? (
              <div className="space-y-2">
                {items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 bg-muted/50 rounded-md"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.item_name || "Unknown Item"}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {item.quantity} × {formatCurrency(item.unit_price || 0)}
                      </p>
                    </div>
                    <p className="font-medium text-sm">
                      {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="font-medium">{purchase.item_name}</p>
                <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                  <span>Quantity: {purchase.quantity}</span>
                  <span>
                    Unit Price: {formatCurrency(purchase.total_cost / purchase.quantity)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Store & Supplier */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Store className="h-3 w-3" /> Store
              </p>
              <p className="text-sm font-medium">{storeName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Truck className="h-3 w-3" /> Supplier
              </p>
              <p className="text-sm font-medium">{supplierName}</p>
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between items-center p-3 bg-primary/10 rounded-md">
            <span className="font-medium flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Total Cost
            </span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(purchase.total_cost)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
