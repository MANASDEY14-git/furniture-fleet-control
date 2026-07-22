import React from 'react';
import { Users, Sparkles, TrendingUp, DollarSign, Award, ArrowUpRight, CheckCircle2, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CoSellingPairSynergy } from '@/hooks/useSalesIntelligence';

interface CoSellingSynergySectionProps {
  pairs?: CoSellingPairSynergy[];
}

export function CoSellingSynergySection({ pairs = [] }: CoSellingSynergySectionProps) {
  if (!pairs || pairs.length === 0) return null;

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" /> Multi-Salesperson 50-50 Split & Co-Selling Synergy Analytics
          </h2>
          <p className="text-xs text-muted-foreground">
            Automatic 50% revenue & commission division for co-attended sales orders with pair synergy diagnostics.
          </p>
        </div>

        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 gap-1 text-xs self-start sm:self-auto">
          <Sparkles className="h-3.5 w-3.5" /> 50-50 Split Rule Enabled
        </Badge>
      </div>

      {/* Top Duo Spotlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pairs.map((pair) => (
          <Card key={pair.pairId} className="bg-gradient-to-br from-purple-500/10 via-card to-card border-purple-500/30 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold text-xs">
                  Synergy Index: {pair.synergyScore}/100
                </Badge>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5" /> +{pair.aovBoostPct}% Duo AOV Boost
                </span>
              </div>

              {/* Duo Avatars & Names */}
              <div className="flex items-center justify-around py-2 border-y border-border/40">
                {/* Person 1 */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10 border-2 border-purple-500/60">
                    <AvatarImage src={pair.person1Avatar} alt={pair.person1Name} />
                    <AvatarFallback className="bg-purple-500 text-white font-bold text-xs">
                      {pair.person1Name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-xs">{pair.person1Name}</div>
                    <div className="text-[10px] text-muted-foreground">50% Revenue Share</div>
                  </div>
                </div>

                <div className="text-xl font-black text-purple-500 px-2">+</div>

                {/* Person 2 */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10 border-2 border-purple-500/60">
                    <AvatarImage src={pair.person2Avatar} alt={pair.person2Name} />
                    <AvatarFallback className="bg-purple-500 text-white font-bold text-xs">
                      {pair.person2Name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-xs">{pair.person2Name}</div>
                    <div className="text-[10px] text-muted-foreground">50% Revenue Share</div>
                  </div>
                </div>
              </div>

              {/* Duo Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-accent/40 rounded-lg p-2 text-center text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] block">Co-Closed Deals</span>
                  <span className="font-bold text-foreground">{pair.totalCoClosedOrders} orders</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Shared Revenue</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pair.totalSharedRevenue)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Duo AOV</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">₹{pair.duoAOV.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Dynamic Duo Insight */}
              <p className="text-xs text-muted-foreground bg-purple-500/5 p-2 rounded-md border border-purple-500/20 italic">
                "{pair.aiInsight}"
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Co-Selling Pairs Table */}
      <Card className="border-border/60">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Co-Attended 50-50 Deal Division Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px] bg-accent/30">
                <TableHead>Salesperson Duo</TableHead>
                <TableHead>Co-Closed Orders</TableHead>
                <TableHead>Total Shared Revenue</TableHead>
                <TableHead>Total Shared Profit</TableHead>
                <TableHead>Shared Commission Split</TableHead>
                <TableHead>Duo AOV vs Solo</TableHead>
                <TableHead>Win Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {pairs.map((p) => (
                <TableRow key={p.pairId}>
                  <TableCell className="font-bold">
                    {p.person1Name} & {p.person2Name}
                  </TableCell>
                  <TableCell>{p.totalCoClosedOrders} deals</TableCell>
                  <TableCell className="font-semibold text-foreground">{formatCurrency(p.totalSharedRevenue)}</TableCell>
                  <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.totalSharedProfit)}</TableCell>
                  <TableCell>₹{p.totalSharedCommission.toLocaleString('en-IN')} (50% each)</TableCell>
                  <TableCell className="text-emerald-600 dark:text-emerald-400 font-semibold">+ {p.aovBoostPct}%</TableCell>
                  <TableCell><Badge variant="outline" className="bg-purple-500/10 text-purple-600">{p.duoConversionRate}%</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
