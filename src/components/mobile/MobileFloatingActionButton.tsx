import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileFloatingActionButtonProps {
  onClick: () => void;
  className?: string;
}

export default function MobileFloatingActionButton({ 
  onClick, 
  className 
}: MobileFloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "mobile-touch-target transition-all duration-200",
        "hover:scale-110 active:scale-95",
        className
      )}
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
}