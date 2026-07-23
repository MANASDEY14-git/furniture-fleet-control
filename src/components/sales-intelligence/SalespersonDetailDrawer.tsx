import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Award, TrendingUp, DollarSign, Target, PackageCheck, Layers,
  Users, ShieldAlert, Sparkles, Printer, ArrowUpRight, ArrowDownRight,
  ShoppingBag, HelpCircle, CheckCircle2, Clock, FileSpreadsheet
} from 'lucide-react';
import { CategoryProductMixChart } from './CategoryProductMixChart';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { PrintableReviewSheet } from './PrintableReviewSheet';
import type { SalespersonPerformance } from '@/hooks/useSalesIntelligence';

interface SalespersonDetailDrawerProps {
  salesperson: SalespersonPerformance | null;
  onClose: () => void;
}

export function SalespersonDetailDrawer({ salesperson, onClose }: SalespersonDetailDrawerProps) {
  const [openPrint, setOpenPrint] = useState(false);

  if (!salesperson) return null;

  const formatCurrency = (val?: number | null) => {
    const n = Number(val ?? 0);
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lakh`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';
    if (score >= 80) return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40';
    if (score >= 70) return 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40';
    if (score >= 55) return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40';
    return 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40';
  };

  return (
    <>
      <Sheet open={!!salesperson} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0 overflow-y-auto bg-background">
          {/* Header Profile Section */}
          <div className="p-6 bg-gradient-to-r from-card via-card to-accent/30 border-b space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/40 shadow-md">
                  <AvatarImage src={salesperson.avatarUrl} alt={salesperson.name} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                    {salesperson.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold tracking-tight">{salesperson.name}</h2>
                    <Badge variant="outline" className={`font-bold text-xs ${getScoreColor(salesperson.performanceScore)}`}>
                      {salesperson.scoreBadgeLabel}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground">{salesperson.role} • {salesperson.branchName}</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">{salesperson.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenPrint(true)}
                  className="gap-1.5 text-xs border-border/60"
                >
                  <Printer className="h-3.5 w-3.5 text-primary" />
                  <span>Print Review Sheet</span>
                </Button>
              </div>
            </div>

            {/* Quick KPI Banner Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-accent/40 rounded-lg p-2.5 text-xs border border-border/40">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Monthly Revenue</span>
                <span className="text-sm font-extrabold">{formatCurrency(salesperson.monthlyRevenue)}</span>
                <span className="text-[10px] text-muted-foreground block">Solo: {formatCurrency(salesperson.soloRevenue)}</span>
              </div>

              <div className="bg-accent/40 rounded-lg p-2.5 text-xs border border-border/40">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Gross Profit</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(salesperson.monthlyProfit)}
                </span>
                <span className="text-[10px] text-muted-foreground block">Margin: {salesperson.profitMarginPct}%</span>
              </div>

              <div className="bg-accent/40 rounded-lg p-2.5 text-xs border border-border/40">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Orders Closed</span>
                <span className="text-sm font-extrabold">{salesperson.ordersClosed} deals</span>
                <span className="text-[10px] text-muted-foreground block">AOV: ₹{salesperson.avgOrderValue.toLocaleString('en-IN')}</span>
              </div>

              <div className="bg-accent/40 rounded-lg p-2.5 text-xs border border-border/40">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Aged Stock Cleared</span>
                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(salesperson.totalValueCleared)}
                </span>
                <span className="text-[10px] text-muted-foreground block">Dead Stock: {salesperson.deadStockClearedPct}%</span>
              </div>
            </div>
          </div>

          {/* Deep Tabs Section */}
          <div className="p-6">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-accent/40 border p-1 w-full justify-start overflow-x-auto h-auto flex-wrap">
                <TabsTrigger value="overview" className="text-xs py-1.5 px-3">Overview & Score</TabsTrigger>
                <TabsTrigger value="product_mix" className="text-xs py-1.5 px-3">Product Mix Radar</TabsTrigger>
                <TabsTrigger value="clearance" className="text-xs py-1.5 px-3">Aged Inventory (50-50)</TabsTrigger>
                <TabsTrigger value="discounts" className="text-xs py-1.5 px-3">Discounts & Violations</TabsTrigger>
                <TabsTrigger value="coselling" className="text-xs py-1.5 px-3">Co-Selling Partners</TabsTrigger>
                <TabsTrigger value="history" className="text-xs py-1.5 px-3">Sales History Log</TabsTrigger>
              </TabsList>

              {/* 1. Overview & Score Breakdown */}
              <TabsContent value="overview" className="space-y-6 m-0">
                {/* Weighted Performance Score Card */}
                <Card className="border-border/60 bg-gradient-to-br from-card to-accent/20">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          <Award className="h-4 w-4 text-amber-500" /> Weighted Performance Score Breakdown (0–100)
                        </h3>
                        <p className="text-xs text-muted-foreground">Formulated from 7 core business management metrics</p>
                      </div>

                      <Badge variant="outline" className={`font-extrabold text-sm px-3 py-1 ${getScoreColor(salesperson.performanceScore)}`}>
                        {salesperson.performanceScore} / 100
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-card p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">Revenue (25%)</span>
                        <span className="font-bold text-sm">{salesperson.scoreBreakdown.revenueScore} / 25</span>
                        <Progress value={(salesperson.scoreBreakdown.revenueScore / 25) * 100} className="h-1 mt-1" />
                      </div>

                      <div className="bg-card p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">Gross Profit (25%)</span>
                        <span className="font-bold text-sm text-emerald-600">{salesperson.scoreBreakdown.profitScore} / 25</span>
                        <Progress value={(salesperson.scoreBreakdown.profitScore / 25) * 100} className="h-1 mt-1" />
                      </div>

                      <div className="bg-card p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">Target % (15%)</span>
                        <span className="font-bold text-sm">{salesperson.scoreBreakdown.targetScore} / 15</span>
                        <Progress value={(salesperson.scoreBreakdown.targetScore / 15) * 100} className="h-1 mt-1" />
                      </div>

                      <div className="bg-card p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">Clearance (15%)</span>
                        <span className="font-bold text-sm text-indigo-600">{salesperson.scoreBreakdown.clearanceScore} / 15</span>
                        <Progress value={(salesperson.scoreBreakdown.clearanceScore / 15) * 100} className="h-1 mt-1" />
                      </div>

                      <div className="bg-card p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">CSAT (10%)</span>
                        <span className="font-bold text-sm">{salesperson.scoreBreakdown.csatScore} / 10</span>
                        <Progress value={(salesperson.scoreBreakdown.csatScore / 10) * 100} className="h-1 mt-1" />
                      </div>

                      <div className="bg-card p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">Product Mix (5%)</span>
                        <span className="font-bold text-sm">{salesperson.scoreBreakdown.productMixScore} / 5</span>
                        <Progress value={(salesperson.scoreBreakdown.productMixScore / 5) * 100} className="h-1 mt-1" />
                      </div>

                      <div className="bg-card p-2.5 rounded-lg border">
                        <span className="text-muted-foreground block text-[10px] font-semibold">Repeat Customers (5%)</span>
                        <span className="font-bold text-sm">{salesperson.scoreBreakdown.repeatCustomerScore} / 5</span>
                        <Progress value={(salesperson.scoreBreakdown.repeatCustomerScore / 5) * 100} className="h-1 mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Coaching Recommendations */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" /> Data-Driven AI Coaching Insights
                  </h3>
                  <div className="space-y-2.5">
                    {salesperson.coachingRecommendations.map(rec => (
                      <Card key={rec.id} className="border-border/60 bg-card">
                        <CardContent className="p-3.5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-primary" /> {rec.title}
                            </span>
                            <Badge variant={rec.urgency === 'HIGH' ? 'destructive' : 'outline'} className="text-[10px]">
                              {rec.urgency} Priority
                            </Badge>
                          </div>
                          <p className="text-muted-foreground">{rec.description}</p>
                          <div className="p-2 rounded bg-primary/10 text-primary font-semibold text-[11px] mt-1">
                            Action: {rec.actionItem}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Monthly Trend Chart */}
                <MonthlyTrendChart data={salesperson.monthlyTrend} />
              </TabsContent>

              {/* 2. Product Mix Radar & Category Breakdown */}
              <TabsContent value="product_mix" className="space-y-4 m-0">
                <CategoryProductMixChart
                  categories={salesperson.categoryBreakdown}
                  title={`${salesperson.name}'s Product Mix & Strengths`}
                  description="Category revenue, gross profit, and unit volume mix"
                />
              </TabsContent>

              {/* 3. Aged Inventory Clearance Contribution */}
              <TabsContent value="clearance" className="space-y-4 m-0">
                <Card className="border-border/60">
                  <CardContent className="p-4 space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-indigo-500" /> Aged Inventory Cleared
                      </h3>
                      <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-600">
                        {formatCurrency(salesperson.totalValueCleared)} Cleared
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-accent/40 p-3 rounded-lg">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Inventory &gt;365 Days Sold</span>
                        <span className="text-lg font-bold text-amber-600">{formatCurrency(salesperson.older365DaysValue)}</span>
                      </div>
                      <div className="bg-accent/40 p-3 rounded-lg">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Inventory &gt;180 Days Sold</span>
                        <span className="text-lg font-bold text-indigo-600">{formatCurrency(salesperson.older180DaysValue)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 4. Discounts & Violations */}
              <TabsContent value="discounts" className="space-y-4 m-0">
                <Card className="border-border/60">
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-rose-500" /> Discount Analysis & Violation Governance
                      </h3>
                    </div>

                    <div className="grid grid-cols-3 gap-3 bg-accent/40 p-3 rounded-lg text-center">
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">Avg Discount</span>
                        <span className="text-base font-bold text-rose-600">{salesperson.avgDiscountPct}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">Highest Discount</span>
                        <span className="text-base font-bold">{salesperson.highestDiscountPct}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">Revenue Lost</span>
                        <span className="text-base font-bold text-rose-600">{formatCurrency(salesperson.revenueLostToDiscounts)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 5. Co-Selling Partners */}
              <TabsContent value="coselling" className="space-y-4 m-0">
                <Card className="border-border/60">
                  <CardContent className="p-4 space-y-3 text-xs">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" /> 50-50 Co-Attended Sales Partners
                    </h3>
                    <div className="space-y-2">
                      {salesperson.coSellingPartners.map(p => (
                        <div key={p.partnerId} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={p.partnerAvatar} alt={p.partnerName} />
                              <AvatarFallback>{p.partnerName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-xs">{p.partnerName}</div>
                              <div className="text-[10px] text-muted-foreground">{p.coClosedOrders} co-closed deals</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-600">{formatCurrency(p.sharedRevenue)}</span>
                            <span className="text-[10px] text-purple-600 block">+{p.synergyBoostPct}% AOV Boost</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 6. Sales History Log */}
              <TabsContent value="history" className="space-y-4 m-0">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-[11px] bg-accent/40">
                        <TableHead>Date</TableHead>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Total Sale</TableHead>
                        <TableHead>50-50 My Split</TableHead>
                        <TableHead>Discount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {salesperson.salesHistory.map((sh) => (
                        <TableRow key={sh.id}>
                          <TableCell>{sh.date}</TableCell>
                          <TableCell className="font-bold">{sh.orderNumber}</TableCell>
                          <TableCell>{sh.customerName}</TableCell>
                          <TableCell>{sh.itemName}</TableCell>
                          <TableCell>{formatCurrency(sh.saleAmount)}</TableCell>
                          <TableCell className="font-bold text-emerald-600">{formatCurrency(sh.mySplitRevenue)}</TableCell>
                          <TableCell>{sh.discountPct}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Printable Review Sheet Preview Dialog */}
      <PrintableReviewSheet
        salesperson={salesperson}
        open={openPrint}
        onOpenChange={setOpenPrint}
      />
    </>
  );
}
