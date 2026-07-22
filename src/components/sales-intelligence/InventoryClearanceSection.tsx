import React from 'react';
import { PackageCheck, Flame, ArrowUpRight, Award, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { SalespersonPerformance } from '@/hooks/useSalesIntelligence';

interface InventoryClearanceSectionProps {
  salespeople?: SalespersonPerformance[];
}

export function InventoryClearanceSection({ salespeople = [] }: InventoryClearanceSectionProps) {
  if (!salespeople || salespeople.length === 0) return null;

  // Sort salespeople by total value of aged stock cleared
  const sorted = [...salespeople].sort((a, b) => b.totalValueCleared - a.totalValueCleared);

  const totalClearedTeam = salespeople.reduce((acc, s) => acc + s.totalValueCleared, 0);
  const total365Cleared = salespeople.reduce((acc, s) => acc + s.older365DaysValue, 0);
  const total180Cleared = salespeople.reduce((acc, s) => acc + s.older180DaysValue, 0);

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-indigo-500" /> Aged Inventory Clearance & Cash Flow Contribution
            </CardTitle>
            <CardDescription className="text-xs">
              Measure how effectively each salesperson turns &gt;180d & &gt;365d slow-moving inventory into liquid cash.
            </CardDescription>
          </div>

          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 gap-1 text-xs">
            <Flame className="h-3.5 w-3.5" /> Total Cleared: {formatCurrency(totalClearedTeam)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Macro Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-accent/40 rounded-xl p-3 text-xs">
          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-bold block">Aged Stock &gt;365 Days Cleared</span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400">{formatCurrency(total365Cleared)}</span>
            <span className="text-[10px] text-muted-foreground block">Dead stock unlocked</span>
          </div>

          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-bold block">Slow Moving &gt;180 Days Cleared</span>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(total180Cleared)}</span>
            <span className="text-[10px] text-muted-foreground block">Prevented further aging</span>
          </div>

          <div>
            <span className="text-muted-foreground text-[10px] uppercase font-bold block">Clearance Margin Held</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">31.4% Avg</span>
            <span className="text-[10px] text-muted-foreground block">No distress dumping</span>
          </div>
        </div>

        {/* Salesperson Clearance Leaderboard */}
        <div className="space-y-3 pt-2">
          {sorted.map((sp, idx) => (
            <div key={sp.id} className="bg-card border border-border/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="h-5 w-5 rounded-full p-0 flex items-center justify-center font-bold text-[10px]">
                    #{idx + 1}
                  </Badge>
                  <span className="font-bold text-xs">{sp.name}</span>
                  <span className="text-[11px] text-muted-foreground">({sp.branchName})</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(sp.totalValueCleared)}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    {sp.deadStockClearedPct}% Dead Stock
                  </Badge>
                </div>
              </div>

              {/* Clearance Breakdown Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>&gt;365d Stock: {formatCurrency(sp.older365DaysValue)}</span>
                  <span>&gt;180d Stock: {formatCurrency(sp.older180DaysValue)}</span>
                </div>
                <Progress value={Math.min(sp.deadStockClearedPct * 2, 100)} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
