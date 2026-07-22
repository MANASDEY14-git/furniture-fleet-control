import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Award, Flame, Coins, ShieldAlert } from 'lucide-react';
import type { InventoryIntelligenceItem } from '@/hooks/useInventoryIntelligence';

interface BusinessInsightsProps {
  items: InventoryIntelligenceItem[];
}

function formatAmount(val: number): string {
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${val.toLocaleString('en-IN')}`;
}

export function BusinessInsights({ items }: BusinessInsightsProps) {
  if (!items || items.length === 0) return null;

  // 1. Dead stock > 365 days
  const deadStockItems = items.filter(i => i.stock_age_days > 365);
  const deadStockVal = deadStockItems.reduce((acc, i) => acc + (i.inventory_cost || 0), 0);

  // 2. Top Hero Product
  const heroItem = [...items].sort((a, b) => b.hero_score - a.hero_score)[0];

  // 3. Fastest Moving Item
  const fastItem = [...items].sort((a, b) => b.monthly_velocity - a.monthly_velocity)[0];

  // 4. Working capital freed by top 10 slow movers
  const slowMovers = [...items]
    .filter(i => i.stock_age_days > 180)
    .sort((a, b) => b.cash_locked - a.cash_locked)
    .slice(0, 10);
  const capitalFreed = slowMovers.reduce((acc, i) => acc + i.cash_locked, 0);

  // 5. Category with highest cash lock
  const catLockMap = new Map<string, number>();
  items.forEach(i => {
    if (i.cash_locked > 0) {
      const cat = i.category_name || 'Uncategorized';
      catLockMap.set(cat, (catLockMap.get(cat) || 0) + i.cash_locked);
    }
  });
  const sortedCatLocks = Array.from(catLockMap.entries()).sort((a, b) => b[1] - a[1]);
  const highestLockCat = sortedCatLocks.length > 0 ? sortedCatLocks[0] : null;

  const insights = [
    {
      title: 'Dead Stock Exposure',
      description: deadStockVal > 0 
        ? `${formatAmount(deadStockVal)} tied up in ${deadStockItems.length} SKUs sitting over 365 days without turnover.`
        : 'Zero critical dead stock detected (>365 days). Great stock clearance discipline!',
      icon: ShieldAlert,
      color: deadStockVal > 0 ? 'text-rose-500 bg-rose-500/10' : 'text-emerald-500 bg-emerald-500/10',
    },
    {
      title: 'Top Business Driver',
      description: heroItem
        ? `"${heroItem.name}" leads with a Hero Score of ${heroItem.hero_score}/100 (${formatAmount(heroItem.revenue_period)} revenue).`
        : 'No clear hero product in selected date range.',
      icon: Award,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      title: 'Fastest Stock Velocity',
      description: fastItem && fastItem.monthly_velocity > 0
        ? `"${fastItem.name}" sells ~${Math.round(fastItem.monthly_velocity)} units/mo. ${fastItem.days_to_sell < 14 ? '⚠️ Stockout risk in <14 days!' : 'Stock coverage looks healthy.'}`
        : 'No fast-moving velocity recorded in the period.',
      icon: Flame,
      color: 'text-orange-500 bg-orange-500/10',
    },
    {
      title: 'Capital Recovery Opportunity',
      description: capitalFreed > 0
        ? `Clearing the top 10 slow-moving items can unlock up to ${formatAmount(capitalFreed)} in liquid working capital.`
        : 'No significant capital locked in slow-moving stock.',
      icon: Coins,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
  ];

  if (highestLockCat) {
    insights.push({
      title: 'Category Cash-Lock Hotspot',
      description: `Category "${highestLockCat[0]}" holds the highest cash lock at ${formatAmount(highestLockCat[1])}.`,
      icon: Lightbulb,
      color: 'text-blue-500 bg-blue-500/10',
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Executive Business Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {insights.slice(0, 4).map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <Card key={idx} className="border bg-gradient-to-br from-card to-card/50 shadow-sm">
              <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-foreground">{insight.title}</CardTitle>
                <div className={`p-1.5 rounded-md ${insight.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
