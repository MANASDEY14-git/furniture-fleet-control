import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MoreHorizontal, Receipt, CreditCard, Wallet, Edit, Trash2 } from 'lucide-react';
import QuickPaymentDialog from '@/components/QuickPaymentDialog';
import QuickPurchaseDialog from '@/components/QuickPurchaseDialog';
import OpeningBalanceDialog from '@/components/OpeningBalanceDialog';
import SupplierForm from '@/components/SupplierForm';
import { useDeleteSupplier, type Supplier } from '@/hooks/useSuppliers';

interface SupplierActionsProps {
  supplier: Supplier;
  storeId?: string;
  onDeleted?: () => void;
}

export function SupplierActions({ supplier, storeId, onDeleted }: SupplierActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const deleteSupplier = useDeleteSupplier();

  const handleDelete = async () => {
    await deleteSupplier.mutateAsync(supplier.id);
    setShowDeleteDialog(false);
    onDeleted?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <QuickPaymentDialog
            supplier={supplier}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Receipt className="h-4 w-4 mr-2" />
                Record Payment
              </DropdownMenuItem>
            }
          />
          <QuickPurchaseDialog
            supplier={supplier}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <CreditCard className="h-4 w-4 mr-2" />
                New Purchase
              </DropdownMenuItem>
            }
          />
          <OpeningBalanceDialog
            supplier={supplier}
            defaultStoreId={storeId}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Wallet className="h-4 w-4 mr-2" />
                Set Opening Balance
              </DropdownMenuItem>
            }
          />
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Supplier
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Supplier
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <SupplierForm
            supplier={supplier}
            onSuccess={() => setShowEditDialog(false)}
            onClose={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{supplier.name}</strong>? This action cannot
              be undone. All associated ledger entries, purchases, and payments will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSupplier.isPending}
            >
              {deleteSupplier.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
