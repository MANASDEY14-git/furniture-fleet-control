
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
      case 'paid in full':
        return 'default';
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
        return 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200';
      case 'pending':
        return 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200';
      case 'paid in full':
        return 'bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200';
      case 'payment':
        return 'bg-red-100 text-red-700 hover:bg-red-100 border-red-200';
      case 'receipt':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200';
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
