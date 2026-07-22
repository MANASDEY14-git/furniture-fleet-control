import React from 'react';
import { DollarSign, TrendingUp, ShoppingBag, Award, Zap, PackageCheck, ArrowUpRight, ArrowDownRight, Users, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ExecutiveKpis } from '@/hooks/useSalesIntelligence';

interface ExecutiveKpiCardsProps {
  kpis?: ExecutiveKpis;
  isLoading?: boolean;
}

export function ExecutiveKpiCards({ kpis, isLoading }: ExecutiveKpiCardsProps) {
  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 bg-card/60 rounded-xl border border-border/40" />
        ))}
      </div>
    );
  }

  // Calculate MoM Percentages
  const revPct = kpis.prevTeamRevenue > 0
    ? Number((((kpis.totalTeamRevenue - kpis.prevTeamRevenue) / kpis.prevTeamRevenue) * 100).toFixed(1))
    : 0;

  const profitPct = kpis.prevGrossProfit > 0
    ? Number((((kpis.totalGrossProfit - kpis.prevGrossProfit) / kpis.prevGrossProfit) * 100).toFixed(1))
    : 0;

  const ordersPct = kpis.prevOrdersClosed > 0
    ? Number((((kpis.totalOrdersClosed - kpis.prevOrdersClosed) / kpis.prevOrdersClosed) * 100).toFixed(1))
    : 0;

  const aovPct = kpis.prevAvgOrderValue > 0
    ? Number((((kpis.avgOrderValue - kpis.prevAvgOrderValue) / kpis.prevAvgOrderValue) * 100).toFixed(1))
    : 0;

  const convDiff = Number((kpis.teamConversionRate - kpis.prevTeamConversionRate).toFixed(1));

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Team Revenue */}
      <Card className="bg-gradient-to-br from-card to-card/90 border-border/60 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Team Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              {formatCurrency(kpis.totalTeamRevenue)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {revPct >= 0 ? (
                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold gap-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5" /> +{revPct}%
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-semibold gap-0.5">
                  <ArrowDownRight className="h-3.5 w-3.5" /> {revPct}%
                </span>
              )}
              <span className="text-muted-foreground">vs last month ({formatCurrency(kpis.prevTeamRevenue)})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Total Gross Profit */}
      <Card className="bg-gradient-to-br from-card to-card/90 border-border/60 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Gross Profit</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              {formatCurrency(kpis.totalGrossProfit)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {profitPct >= 0 ? (
                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold gap-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5" /> +{profitPct}%
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-semibold gap-0.5">
                  <ArrowDownRight className="h-3.5 w-3.5" /> {profitPct}%
                </span>
              )}
              <span className="text-muted-foreground">
                ({kpis.totalTeamRevenue > 0 ? ((kpis.totalGrossProfit / kpis.totalTeamRevenue) * 100).toFixed(1) : 0}% Margin)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Total Orders Closed */}
      <Card className="bg-gradient-to-br from-card to-card/90 border-border/60 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orders Closed</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              {kpis.totalOrdersClosed} <span className="text-sm font-normal text-muted-foreground">deals</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {ordersPct >= 0 ? (
                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold gap-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5" /> +{ordersPct}%
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-semibold gap-0.5">
                  <ArrowDownRight className="h-3.5 w-3.5" /> {ordersPct}%
                </span>
              )}
              <span className="text-muted-foreground">vs {kpis.prevOrdersClosed} last month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Average Order Value (AOV) */}
      <Card className="bg-gradient-to-br from-card to-card/90 border-border/60 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Average Order Value</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              ₹{kpis.avgOrderValue.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {aovPct >= 0 ? (
                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold gap-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5" /> +{aovPct}%
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-semibold gap-0.5">
                  <ArrowDownRight className="h-3.5 w-3.5" /> {aovPct}%
                </span>
              )}
              <span className="text-muted-foreground">vs ₹{kpis.prevAvgOrderValue.toLocaleString('en-IN')} prev</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Team Conversion Rate */}
      <Card className="bg-gradient-to-br from-card to-card/90 border-border/60 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Conversion Rate</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              {kpis.teamConversionRate}%
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              {convDiff >= 0 ? (
                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold gap-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5" /> +{convDiff}%
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-600 dark:text-rose-400 font-semibold gap-0.5">
                  <ArrowDownRight className="h-3.5 w-3.5" /> {convDiff}%
                </span>
              )}
              <span className="text-muted-foreground">vs {kpis.prevTeamConversionRate}% last month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6. Inventory Cleared Value */}
      <Card className="bg-gradient-to-br from-card to-card/90 border-border/60 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Inventory Cleared Value</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <PackageCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold tracking-tight">
              {formatCurrency(kpis.inventoryClearedValue)}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold gap-0.5">
                <ArrowUpRight className="h-3.5 w-3.5" /> +16.0%
              </span>
              <span className="text-muted-foreground">dead stock turned into cash</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. Best Performer Card */}
      <Card className="bg-gradient-to-br from-amber-500/10 via-card to-card border-amber-500/30 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-amber-500/60 shadow-sm shrink-0">
            <AvatarImage src={kpis.bestPerformer.avatarUrl} alt={kpis.bestPerformer.name} />
            <AvatarFallback className="bg-amber-500 text-white text-xs font-bold">
              {kpis.bestPerformer.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0">
                <Award className="h-3 w-3 mr-0.5 text-amber-500" /> Best Performer
              </Badge>
            </div>
            <div className="text-base font-bold truncate mt-0.5">{kpis.bestPerformer.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              Score: <span className="font-bold text-amber-600 dark:text-amber-400">{kpis.bestPerformer.score}/100</span> | {formatCurrency(kpis.bestPerformer.revenue)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 8. Most Improved Salesperson Card */}
      <Card className="bg-gradient-to-br from-emerald-500/10 via-card to-card border-emerald-500/30 shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4 flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-emerald-500/60 shadow-sm shrink-0">
            <AvatarImage src={kpis.mostImproved.avatarUrl} alt={kpis.mostImproved.name} />
            <AvatarFallback className="bg-emerald-500 text-white text-xs font-bold">
              {kpis.mostImproved.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0">
                <Sparkles className="h-3 w-3 mr-0.5 text-emerald-500" /> Most Improved
              </Badge>
            </div>
            <div className="text-base font-bold truncate mt-0.5">{kpis.mostImproved.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{kpis.mostImproved.improvementPct}% MoM</span> gain
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
