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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/currencyUtils";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useStoreContext } from "@/contexts/StoreContext";

export type CancelSettlement = "credit" | "refund";

export interface CancelConfirmPayload {
  reason: string;
  settlement: CancelSettlement;
  refundMethod: string;
  refundBankAccountId: string | null;
}

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: CancelConfirmPayload) => void;
  orderNumber: string;
  itemCount: number;
  /** Money already collected on this order */
  collectedAmount?: number;
}

const NON_BANK_METHODS = ["cash"];

export const CancelOrderDialog = ({
  open,
  onOpenChange,
  onConfirm,
  orderNumber,
  itemCount,
  collectedAmount = 0,
}: CancelOrderDialogProps) => {
  const [cancellationReason, setCancellationReason] = useState("");
  const [settlement, setSettlement] = useState<CancelSettlement>("credit");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [refundBankAccountId, setRefundBankAccountId] = useState<string>("");

  const { activeStoreId } = useStoreContext();
  const { data: bankAccounts = [] } = useBankAccounts(activeStoreId || undefined);

  const hasMoney = Number(collectedAmount) > 0;
  const needsBankAccount = settlement === "refund" && !NON_BANK_METHODS.includes(refundMethod);
  const canConfirm =
    cancellationReason.trim().length > 0 && (!needsBankAccount || !!refundBankAccountId);

  const reset = () => {
    setCancellationReason("");
    setSettlement("credit");
    setRefundMethod("cash");
    setRefundBankAccountId("");
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      reason: cancellationReason.trim(),
      settlement: hasMoney ? settlement : "credit",
      refundMethod,
      refundBankAccountId: needsBankAccount ? refundBankAccountId : null,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
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
                className="min-h-[80px]"
              />
            </div>

            {hasMoney && (
              <div className="space-y-3 rounded-md border p-3">
                <div>
                  <p className="font-medium text-foreground">
                    {formatCurrency(collectedAmount)} already collected
                  </p>
                  <p className="text-xs">What should happen to this money?</p>
                </div>

                <RadioGroup
                  value={settlement}
                  onValueChange={(v) => setSettlement(v as CancelSettlement)}
                  className="space-y-2"
                >
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="credit" id="settle-credit" className="mt-1" />
                    <Label htmlFor="settle-credit" className="font-normal cursor-pointer">
                      <span className="block font-medium text-foreground">Keep as customer credit</span>
                      <span className="text-xs">Money stays with the store and can be used on a future order.</span>
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="refund" id="settle-refund" className="mt-1" />
                    <Label htmlFor="settle-refund" className="font-normal cursor-pointer">
                      <span className="block font-medium text-foreground">Refund to customer</span>
                      <span className="text-xs">Records money going out of the selected account.</span>
                    </Label>
                  </div>
                </RadioGroup>

                {settlement === "refund" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-foreground text-xs">Refund method</Label>
                      <Select value={refundMethod} onValueChange={setRefundMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {needsBankAccount && (
                      <div className="space-y-1">
                        <Label className="text-foreground text-xs">
                          From account <span className="text-destructive">*</span>
                        </Label>
                        <Select value={refundBankAccountId} onValueChange={setRefundBankAccountId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_name} — {account.bank_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">What will happen:</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Order status will be set to "Cancelled"</li>
                <li>Item stock will be restored</li>
                <li>BOM materials will be restored (if applicable)</li>
                <li>Order value is removed from sales, receivables and the customer's account</li>
                <li>Order cannot be reactivated after cancellation</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={reset}>Keep Order</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Cancel Order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
