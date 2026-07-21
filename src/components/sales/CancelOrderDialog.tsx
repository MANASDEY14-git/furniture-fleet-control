import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  orderNumber: string;
  itemCount: number;
}

export const CancelOrderDialog = ({
  open,
  onOpenChange,
  onConfirm,
  orderNumber,
  itemCount,
}: CancelOrderDialogProps) => {
  const [cancellationReason, setCancellationReason] = useState("");

  const handleConfirm = () => {
    if (cancellationReason.trim()) {
      onConfirm(cancellationReason);
      setCancellationReason("");
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Order #{orderNumber}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This action will cancel the order and restore stock for {itemCount}{" "}
              item{itemCount !== 1 ? "s" : ""}.
            </p>
            <div className="space-y-2">
              <Label htmlFor="cancellation-reason" className="text-foreground">
                Cancellation Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancellation-reason"
                placeholder="e.g., Customer requested cancellation, Order placed by mistake..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">What will happen:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Order status will be set to "Cancelled"</li>
                <li>Item stock will be restored</li>
                <li>BOM materials will be restored (if applicable)</li>
                <li>Order cannot be reactivated after cancellation</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setCancellationReason("")}>
            Keep Order
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!cancellationReason.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            Cancel Order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
