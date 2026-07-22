import React from 'react';
import { Award, TrendingUp, ShoppingBag, Target, ShieldAlert, ArrowUpRight, ArrowDownRight, ChevronRight, Zap, Users, PackageCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { SalespersonPerformance } from '@/hooks/useSalesIntelligence';

interface SalespersonLeaderboardProps {
  salespeople?: SalespersonPerformance[];
  onSelectSalesperson: (sp: SalespersonPerformance) => void;
}

export function SalespersonLeaderboard({ salespeople = [], onSelectSalesperson }: SalespersonLeaderboardProps) {
  if (!salespeople || salespeople.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground">
        No sales representatives match the current filter criteria.
      </div>
    );
  }

  // Sort salespeople by weighted performance score (descending)
  const sorted = [...salespeople].sort((a, b) => b.performanceScore - a.performanceScore);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';
    if (score >= 80) return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40';
    if (score >= 70) return 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40';
    if (score >= 55) return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40';
    return 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40';
  };

  const getStatusBadge = (status: SalespersonPerformance['badgeStatus']) => {
    switch (status) {
      case 'Excellent':
        return <Badge className="bg-emerald-500 text-white font-semibold text-[10px] px-2 py-0.5">Excellent</Badge>;
      case 'Good':
        return <Badge className="bg-blue-500 text-white font-semibold text-[10px] px-2 py-0.5">Good</Badge>;
      case 'Needs Attention':
      default:
        return <Badge variant="destructive" className="font-semibold text-[10px] px-2 py-0.5">Needs Attention</Badge>;
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" /> Salesperson Performance Leaderboard
          </h2>
          <p className="text-xs text-muted-foreground">
            Ranked by weighted score (Revenue 25%, Profit 25%, Target 15%, Aged Inventory 15%, CSAT 10%, Product Mix 5%, Repeat 5%)
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
          {salespeople.length} Sales Representatives
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((sp, rankIdx) => (
          <Card
            key={sp.id}
            onClick={() => onSelectSalesperson(sp)}
            className="group cursor-pointer bg-card hover:bg-card/90 border-border/60 hover:border-primary/50 transition-all duration-200 hover:shadow-lg relative overflow-hidden flex flex-col justify-between"
          >
            {/* Rank Ribbon */}
            <div className="absolute top-0 right-0">
              <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-bl-xl ${
                rankIdx === 0 ? 'bg-amber-500 text-slate-950' :
                rankIdx === 1 ? 'bg-slate-300 text-slate-950 dark:bg-slate-700 dark:text-slate-100' :
                rankIdx === 2 ? 'bg-amber-700 text-white' : 'bg-accent text-muted-foreground'
              }`}>
                #{rankIdx + 1} Rank
              </div>
            </div>

            <CardContent className="p-4 space-y-3.5">
              {/* Header Profile Info */}
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/30 shadow-sm shrink-0">
                  <AvatarImage src={sp.avatarUrl} alt={sp.name} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                    {sp.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 pr-12">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-base truncate group-hover:text-primary transition-colors">
                      {sp.name}
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground truncate">{sp.role}</p>
                  <p className="text-[11px] text-muted-foreground/80 truncate">{sp.branchName}</p>
                </div>
              </div>

              {/* Status Badges & Weighted Score Badge */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(sp.badgeStatus)}
                  {sp.coSellingDealsCount > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 gap-1 px-1.5">
                      <Users className="h-3 w-3" /> 50-50 Duo
                    </Badge>
                  )}
                </div>

                <Badge variant="outline" className={`font-bold text-xs px-2 py-0.5 ${getScoreColor(sp.performanceScore)}`}>
                  {sp.scoreBadgeLabel}
                </Badge>
              </div>

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 bg-accent/40 rounded-lg p-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Revenue</span>
                  <span className="font-bold text-sm text-foreground">{formatCurrency(sp.monthlyRevenue)}</span>
                </div>

                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Gross Profit</span>
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(sp.monthlyProfit)} <span className="text-[10px] text-muted-foreground">({sp.profitMarginPct}%)</span>
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Orders Closed</span>
                  <span className="font-bold text-foreground">{sp.ordersClosed} deals ({sp.unitsSold} units)</span>
                </div>

                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Avg Order Value</span>
                  <span className="font-bold text-foreground">₹{sp.avgOrderValue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Target Achievement Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                    <Target className="h-3 w-3 text-primary" /> Target ({formatCurrency(sp.monthlyTarget)})
                  </span>
                  <span className={`font-bold ${sp.achievementPct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {sp.achievementPct}% Achieved
                  </span>
                </div>
                <Progress value={Math.min(sp.achievementPct, 100)} className="h-1.5" />
              </div>

              {/* Highlights & Warning Alerts */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <PackageCheck className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Aged Cleared: <strong className="text-foreground">₹{(sp.totalValueCleared / 100000).toFixed(1)}L</strong></span>
                </div>

                {sp.avgDiscountPct > 10.0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5">
                    <ShieldAlert className="h-3 w-3" /> {sp.avgDiscountPct}% Discount
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <ArrowUpRight className="h-3 w-3" /> +{sp.trendPctChange}% MoM
                  </span>
                )}
              </div>
            </CardContent>

            {/* Bottom Card Action Link */}
            <div className="px-4 py-2 bg-accent/30 border-t border-border/40 flex items-center justify-between text-xs font-semibold text-primary group-hover:bg-primary/10 transition-colors">
              <span>View Full Performance Dashboard</span>
              <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
