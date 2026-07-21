import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SupplierForm from '@/components/SupplierForm';

interface SupplierHeaderProps {
  isMobile: boolean;
}

export function SupplierHeader({ isMobile }: SupplierHeaderProps) {
  if (isMobile) {
    return (
      <div className="py-1.5">
        <h1 className="text-base font-semibold text-foreground">Suppliers</h1>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
      <SupplierForm
        trigger={
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        }
      />
    </div>
  );
}
