import { Users, AlertTriangle, TrendingUp, Wallet } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SummaryData {
  totalSuppliers: number;
  totalOutstanding: number;
  totalAdvances: number;
  suppliersWithDues: number;
}

interface SupplierStatsBarProps {
  data: SummaryData;
  isMobile: boolean;
}

export function SupplierStatsBar({ data, isMobile }: SupplierStatsBarProps) {
  const stats = [
    {
      label: 'Total',
      value: data.totalSuppliers.toString(),
      icon: Users,
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
    {
      label: 'Outstanding',
      value: `₹${data.totalOutstanding.toLocaleString('en-IN')}`,
      icon: AlertTriangle,
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
    },
    {
      label: 'Advances',
      value: `₹${data.totalAdvances.toLocaleString('en-IN')}`,
      icon: Wallet,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10',
    },
    {
      label: 'With Dues',
      value: data.suppliersWithDues.toString(),
      icon: TrendingUp,
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-500/10',
    },
  ];

  const StatItem = ({ stat }: { stat: typeof stats[0] }) => (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-card',
        isMobile ? 'p-2 min-w-[110px]' : 'p-3 min-w-[140px]',
        isMobile && 'snap-center'
      )}
    >
      <div className={cn('p-1 rounded-md', stat.bgClass)}>
        <stat.icon className={cn('h-3.5 w-3.5', stat.colorClass)} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
          {stat.label}
        </p>
        <p className={cn('text-xs font-bold truncate', stat.colorClass)}>{stat.value}</p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <ScrollArea className="w-full py-1.5 -mx-3 px-3">
        <div className="flex gap-2 pb-1 snap-x snap-mandatory">
          {stats.map((stat) => (
            <StatItem key={stat.label} stat={stat} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {stats.map((stat) => (
        <StatItem key={stat.label} stat={stat} />
      ))}
    </div>
  );
}
