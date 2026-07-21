import { Badge } from '@/components/ui/badge';
import { Phone, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupplierBalanceData {
  opening: number;
  openingType: string;
  debit: number;
  credit: number;
  balance: number;
}

interface SupplierCardProps {
  supplier: {
    id: string;
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  balanceData: SupplierBalanceData;
  isSelected: boolean;
  onClick: () => void;
}

export function SupplierCard({ supplier, balanceData, isSelected, onClick }: SupplierCardProps) {
  const getBalanceStatus = (balance: number) => {
    if (balance > 10000) return { label: 'High Due', variant: 'destructive' as const, stripe: 'border-l-destructive' };
    if (balance > 0) return { label: 'Due', variant: 'default' as const, stripe: 'border-l-amber-500' };
    if (balance < -1000) return { label: 'Advance', variant: 'secondary' as const, stripe: 'border-l-emerald-500' };
    return { label: 'Settled', variant: 'outline' as const, stripe: 'border-l-muted-foreground/30' };
  };

  const status = getBalanceStatus(balanceData.balance);
  const isPositiveBalance = balanceData.balance >= 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={cn(
        'relative overflow-hidden rounded-lg border bg-card cursor-pointer transition-all duration-150',
        'border-l-[3px]',
        status.stripe,
        'hover:border-primary/40 hover:bg-accent/50 active:scale-[0.99]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected && 'ring-2 ring-primary shadow-sm'
      )}
    >
      {/* Compact card content */}
      <div className="px-2.5 py-2">
        {/* Row 1: Supplier Name (left) + Balance (right, large, bold) */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-foreground text-sm leading-tight truncate flex-1">
            {supplier.name}
          </h3>
          <span className={cn(
            'text-base font-bold shrink-0 tabular-nums',
            isPositiveBalance ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
          )}>
            ₹{Math.abs(balanceData.balance).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Row 2: Status badge */}
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={status.variant} className="h-5 px-1.5 text-[10px]">
            {status.label}
          </Badge>
          <span className={cn(
            'text-[10px] font-medium',
            isPositiveBalance ? 'text-destructive/70' : 'text-emerald-600/70 dark:text-emerald-400/70'
          )}>
            {isPositiveBalance ? 'Due' : 'Advance'}
          </span>
        </div>

        {/* Row 3: Address (single line, truncated) */}
        {supplier.address && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground/80 mb-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{supplier.address}</span>
          </div>
        )}

        {/* Row 4: Phone (tertiary - lighter) */}
        {supplier.phone && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
            <Phone className="w-2.5 h-2.5 shrink-0" />
            <span>{supplier.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
}
