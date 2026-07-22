import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, Sparkles, Award, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { SalespersonPerformance } from '@/hooks/useSalesIntelligence';

interface PrintableReviewSheetProps {
  salesperson: SalespersonPerformance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintableReviewSheet({ salesperson, open, onOpenChange }: PrintableReviewSheetProps) {
  if (!salesperson) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" /> Executive Sales Performance Review Sheet
            </DialogTitle>
            <DialogDescription className="text-xs">
              Official monthly performance appraisal document for Furniture Fleet Control ERP.
            </DialogDescription>
          </div>

          <Button size="sm" onClick={handlePrint} className="gap-1.5 text-xs font-semibold">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
        </DialogHeader>

        {/* Printable Area Container */}
        <div className="space-y-6 text-foreground print:p-0 print:m-0">
          {/* Executive Header Banner */}
          <div className="flex items-center justify-between p-4 bg-accent/40 rounded-xl border border-border/60">
            <div className="space-y-1">
              <h2 className="text-2xl font-black">{salesperson.name}</h2>
              <p className="text-xs text-muted-foreground">{salesperson.role} — {salesperson.branchName}</p>
              <p className="text-[11px] text-muted-foreground">Email: {salesperson.email}</p>
            </div>

            <div className="text-right space-y-1">
              <Badge className="text-sm font-extrabold px-3 py-1 bg-primary text-primary-foreground">
                {salesperson.scoreBadgeLabel}
              </Badge>
              <div className="text-xs font-semibold text-muted-foreground block">
                Period: July 2026
              </div>
            </div>
          </div>

          {/* Key Score Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-card border rounded-lg">
              <span className="text-[10px] uppercase text-muted-foreground block">Monthly Revenue</span>
              <span className="text-lg font-bold">{formatCurrency(salesperson.monthlyRevenue)}</span>
              <span className="text-[10px] text-emerald-600 block">Target: {formatCurrency(salesperson.monthlyTarget)}</span>
            </div>

            <div className="p-3 bg-card border rounded-lg">
              <span className="text-[10px] uppercase text-muted-foreground block">Gross Profit</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(salesperson.monthlyProfit)}</span>
              <span className="text-[10px] text-muted-foreground block">{salesperson.profitMarginPct}% Profit Margin</span>
            </div>

            <div className="p-3 bg-card border rounded-lg">
              <span className="text-[10px] uppercase text-muted-foreground block">Deals Closed</span>
              <span className="text-lg font-bold">{salesperson.ordersClosed} orders</span>
              <span className="text-[10px] text-muted-foreground block">{salesperson.unitsSold} total units</span>
            </div>

            <div className="p-3 bg-card border rounded-lg">
              <span className="text-[10px] uppercase text-muted-foreground block">Aged Stock Cleared</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(salesperson.totalValueCleared)}</span>
              <span className="text-[10px] text-muted-foreground block">{salesperson.deadStockClearedPct}% dead stock</span>
            </div>
          </div>

          {/* Weighted Performance Scoring Matrix */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Weighted Evaluation Matrix (0–100)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border rounded-lg p-3 bg-card">
              <div>
                <span className="text-muted-foreground block">Revenue (25%)</span>
                <span className="font-bold">{salesperson.scoreBreakdown.revenueScore} / 25</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Gross Profit (25%)</span>
                <span className="font-bold">{salesperson.scoreBreakdown.profitScore} / 25</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Target % (15%)</span>
                <span className="font-bold">{salesperson.scoreBreakdown.targetScore} / 15</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Inventory (15%)</span>
                <span className="font-bold">{salesperson.scoreBreakdown.clearanceScore} / 15</span>
              </div>
              <div>
                <span className="text-muted-foreground block">CSAT (10%)</span>
                <span className="font-bold">{salesperson.scoreBreakdown.csatScore} / 10</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Product Mix (5%)</span>
                <span className="font-bold">{salesperson.scoreBreakdown.productMixScore} / 5</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Repeat Customers (5%)</span>
                <span className="font-bold">{salesperson.scoreBreakdown.repeatCustomerScore} / 5</span>
              </div>
              <div className="font-black text-primary">
                <span className="text-muted-foreground block">Total Score</span>
                <span className="text-base">{salesperson.performanceScore} / 100</span>
              </div>
            </div>
          </div>

          {/* AI Coaching Action Plan */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Management Coaching Action Plan
            </h3>
            <div className="space-y-2">
              {salesperson.coachingRecommendations.map(rec => (
                <div key={rec.id} className="p-3 bg-accent/30 border rounded-lg text-xs space-y-1">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {rec.title}
                  </div>
                  <p className="text-muted-foreground">{rec.description}</p>
                  <p className="font-semibold text-primary">Recommended Action: {rec.actionItem}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t text-xs">
            <div className="border-t border-dashed pt-2">
              <span className="text-muted-foreground block">Sales Representative Signature</span>
              <span className="font-semibold">{salesperson.name}</span>
            </div>
            <div className="border-t border-dashed pt-2">
              <span className="text-muted-foreground block">Store Manager / Owner Signature</span>
              <span className="font-semibold">Store Management</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
