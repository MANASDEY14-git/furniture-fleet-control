
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export default function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const getVariant = () => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'payment':
        return 'destructive';
      case 'receipt':
        return 'default';
      default:
        return variant;
    }
  };

  const getColorClass = () => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'payment':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'receipt':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      default:
        return '';
    }
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={cn('text-xs font-medium', getColorClass())}
    >
      {status}
    </Badge>
  );
}
