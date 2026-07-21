import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import DeliveryDetailPanel from './DeliveryDetailPanel';
import type { DeliveryEvent } from '@/types/erp';

interface DeliveryBottomSheetProps {
  delivery: DeliveryEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export default function DeliveryBottomSheet({
  delivery,
  isOpen,
  onClose,
  onNavigate,
  hasPrev,
  hasNext,
}: DeliveryBottomSheetProps) {
  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Delivery Details</DrawerTitle>
        </DrawerHeader>
        <div className="h-[75vh] overflow-hidden">
          <DeliveryDetailPanel
            delivery={delivery}
            onClose={onClose}
            onNavigate={onNavigate}
            hasPrev={hasPrev}
            hasNext={hasNext}
            isMobile
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
