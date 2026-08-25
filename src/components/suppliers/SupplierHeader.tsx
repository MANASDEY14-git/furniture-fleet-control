import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SupplierForm from '@/components/SupplierForm';
import { SupplierStoreAccessDialog } from './SupplierStoreAccessDialog';

interface SupplierHeaderProps {
  isMobile: boolean;
  hideTitle?: boolean;
}

export function SupplierHeader({ isMobile, hideTitle = false }: SupplierHeaderProps) {
  if (isMobile) {
    return (
      <div className="py-1.5 flex justify-between items-center">
        {!hideTitle && <h1 className="text-base font-semibold text-foreground">Suppliers</h1>}
        <SupplierStoreAccessDialog />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-4">
      {!hideTitle && <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>}
      {hideTitle && <div />}
      <div className="flex items-center gap-2">
        <SupplierStoreAccessDialog />
        <SupplierForm
          trigger={
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          }
        />
      </div>
    </div>
  );
}
