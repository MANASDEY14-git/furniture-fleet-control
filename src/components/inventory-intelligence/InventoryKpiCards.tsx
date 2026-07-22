import { Card as CardUI, CardContent as CardContentUI } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Lock, 
  AlertTriangle, 
  PackageCheck, 
  Zap, 
  Hourglass 
} from 'lucide-react';
import type { InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

interface InventoryKpiCardsProps {
  items: InventoryIntelligenceItem[];
  isLoading?: boolean;
}

function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export function InventoryKpiCards({ items, isLoading }: InventoryKpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  const totalValue = items.reduce((acc, i) => acc + (i.inventory_value || 0), 0);
  const totalCost = items.reduce((acc, i) => acc + (i.inventory_cost || 0), 0);
  const avgAge = items.length > 0 ? Math.round(items.reduce((acc, i) => acc + (i.stock_age_days || 0), 0) / items.length) : 0;
  const cashLocked = items.reduce((acc, i) => acc + (i.cash_locked || 0), 0);
  const deadStockVal = items
    .filter(i => i.stock_age_bucket === 'Dead Stock' || i.stock_age_bucket === 'Critical')
    .reduce((acc, i) => acc + (i.inventory_cost || 0), 0);
  const activeSKUs = items.length;
  const totalMonthlySales = items.reduce((acc, i) => acc + (i.monthly_velocity || 0), 0);
  const turnoverRatio = totalCost > 0 ? ((items.reduce((acc, i) => acc + (i.revenue_period || 0), 0) / totalCost) * 100).toFixed(1) : '0.0';

  // Oldest product calculation
  const oldestItem = items.length > 0 ? [...items].sort((a, b) => (b.stock_age_days || 0) - (a.stock_age_days || 0))[0] : null;

  const kpis = [
    {
      title: 'Total Stock Value',
      value: formatCurrency(totalValue),
      subtext: `Cost: ${formatCurrency(totalCost)}`,
      icon: DollarSign,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Total Stock Cost',
      value: formatCurrency(totalCost),
      subtext: `${activeSKUs} Active SKUs`,
      icon: TrendingUp,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Avg Stock Age',
      value: `${avgAge} Days`,
      subtext: avgAge > 180 ? 'Attention Needed' : 'Healthy Turn',
      icon: Clock,
      color: avgAge > 180 ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Cash Locked',
      value: formatCurrency(cashLocked),
      subtext: '>180 Days in Stock',
      icon: Lock,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Dead Stock Value',
      value: formatCurrency(deadStockVal),
      subtext: '>365 Days Unsold',
      icon: AlertTriangle,
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
    {
      title: 'Active SKUs',
      value: activeSKUs.toLocaleString(),
      subtext: 'In Inventory',
      icon: PackageCheck,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Turnover Ratio',
      value: `${turnoverRatio}%`,
      subtext: `~${Math.round(totalMonthlySales)} units / mo`,
      icon: Zap,
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      title: 'Oldest Product',
      value: oldestItem ? `${oldestItem.stock_age_days}d` : '0d',
      subtext: oldestItem ? oldestItem.name : 'None',
      icon: Hourglass,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <CardUI key={index} className="border bg-card/60 backdrop-blur hover:bg-card/90 transition-all shadow-sm">
            <CardContentUI className="p-3 flex flex-col justify-between h-full space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground truncate">{kpi.title}</span>
                <div className={`p-1.5 rounded-lg border ${kpi.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-base font-bold tracking-tight text-foreground truncate">{kpi.value}</div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={kpi.subtext}>
                  {kpi.subtext}
                </p>
              </div>
            </CardContentUI>
          </CardUI>
        );
      })}
    </div>
  );
}
